import {
	API,
	MessageFlags,
	type RESTGetAPIChannelMessagesResult,
	type Snowflake,
} from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { isBulkDeletable } from "../utility/functions.js";
import type { InformationChannel } from "./information-channel.js";

/**
 * Options for {@link DiscordDelivery}.
 */
export interface DiscordDeliveryOptions {
	/**
	 * Discord token.
	 */
	token: string;
	/**
	 * Data containing channel ids with their message ids.
	 */
	data: Record<Snowflake, readonly Snowflake[]>;
	/**
	 * Information channels.
	 */
	informationChannels: readonly InformationChannel[];
	/**
	 * Whether to force all channels to regenerate content.
	 * @default false
	 */
	force?: boolean;
}

/**
 * The main class for Discord Delivery.
 */
export class DiscordDelivery {
	/**
	 * API instance for Discord.
	 */
	private readonly api: API;

	/**
	 * Data containing channel ids with their message ids.
	 */
	private readonly data: Record<Snowflake, readonly Snowflake[]>;

	/**
	 * Information channels.
	 */
	private readonly informationChannels: readonly InformationChannel[];

	/**
	 * Whether to force all channels to regenerate content.
	 */
	private readonly force: boolean;

	/**
	 * Creates the Discord Delivery instance.
	 *
	 * @param options Options for Discord Delivery.
	 */
	public constructor(options: DiscordDeliveryOptions) {
		this.api = new API(new REST().setToken(options.token));
		this.data = options.data;
		this.informationChannels = options.informationChannels;
		this.force = options.force ?? false;
	}

	private async regenerate(
		informationChannel: InformationChannel,
		messages: RESTGetAPIChannelMessagesResult,
	): Promise<readonly Snowflake[]> {
		// Delete existing messages.
		const bulkDeletableMessages: Snowflake[] = [];
		const nonBulkDeletableMessages: Snowflake[] = [];

		for (const { id } of messages) {
			if (isBulkDeletable(id)) {
				bulkDeletableMessages.push(id);
			} else {
				nonBulkDeletableMessages.push(id);
			}
		}

		if (bulkDeletableMessages.length >= 2) {
			try {
				await this.api.channels.bulkDeleteMessages(informationChannel.id, bulkDeletableMessages);
			} catch (error) {
				console.error(
					`Failed to bulk delete messages for channel id ${informationChannel.id}. Pushing to non-bulk deletable messages.`,
					error,
				);

				nonBulkDeletableMessages.push(...bulkDeletableMessages);
			}
		} else {
			nonBulkDeletableMessages.push(...bulkDeletableMessages);
		}

		for (const messageId of nonBulkDeletableMessages) {
			try {
				await this.api.channels.deleteMessage(informationChannel.id, messageId);
			} catch (error) {
				console.error(
					`Failed to delete message id ${messageId} in channel id ${informationChannel.id}.`,
					error,
				);
			}
		}

		// Regenerate messages.
		const messageIds: Snowflake[] = [];

		for (const message of informationChannel.messages) {
			try {
				let flags = MessageFlags.SuppressEmbeds;

				if (message.flags) {
					flags |= message.flags;
				}

				const { id: messageId } = await this.api.channels.createMessage(informationChannel.id, {
					...message,
					allowed_mentions: { parse: [] },
					flags,
				});

				messageIds.push(messageId);
			} catch (error) {
				console.error(`Failed to create message in channel id ${informationChannel.id}.`, error);
			}
		}

		return messageIds;
	}

	/**
	 * Starts the Discord Delivery process.
	 */
	public async start(): Promise<typeof this.data> {
		const result = JSON.parse(JSON.stringify(this.data)) as typeof this.data;

		iteration: for (const informationChannel of this.informationChannels) {
			console.info(`Checking channel id ${informationChannel.id}.`);
			let messages: RESTGetAPIChannelMessagesResult;

			try {
				messages = await this.api.channels.getMessages(informationChannel.id, { limit: 100 });
			} catch (error) {
				console.error("Failed to fetch messages.", error);
				continue;
			}

			// If there is a length of exactly 100, there is a problem. There should not be so many messages.
			if (messages.length === 100) {
				console.error("100 messages fetched. This is not expected. Continuing...");
				continue;
			}

			if (this.force) {
				console.info("Forcing regeneration...");
				const newMessageIds = await this.regenerate(informationChannel, messages);
				result[informationChannel.id] = newMessageIds;
				continue;
			}

			// Detect a difference in length.
			if (messages.length !== informationChannel.messages.length) {
				console.info("Detected a difference in the amount of messages. Regenerating...");
				const newMessageIds = await this.regenerate(informationChannel, messages);
				result[informationChannel.id] = newMessageIds;
				continue;
			}

			// Iterate over the messages and check for any differences.
			for (const [index, message] of messages.reverse().entries()) {
				const localMessage = informationChannel.messages[index];

				if (message.content === "" && !localMessage?.content) {
					// There is no content to compare. Continue for now.
					continue;
				}

				if (message.content !== localMessage?.content) {
					console.info(
						`Detected a difference in message content for ${message.id}. Regenerating...`,
					);
					console.info(`Old: ${message.content}`);
					console.info(`New: ${localMessage?.content}`);
					const newMessageIds = await this.regenerate(informationChannel, messages);
					result[informationChannel.id] = newMessageIds;
					continue iteration;
				}
			}

			console.info("No changes found. Continuing...");
		}

		return result;
	}
}
