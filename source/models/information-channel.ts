import type { APIMessageTopLevelComponent, MessageFlags, Snowflake } from "@discordjs/core";
import type { RawFile } from "@discordjs/rest";

/**
 * A message that may be in an information channel.
 */
export interface InformationMessage {
	/**
	 * Components for the message.
	 */
	components?: APIMessageTopLevelComponent[];
	/**
	 * Content for the message.
	 */
	content?: string;
	/**
	 * Files for the message.
	 */
	files?: RawFile[];
	/**
	 * Flags for the message.
	 */
	flags?: MessageFlags.IsComponentsV2;
}

/**
 * Options for {@link InformationChannel}.
 */
export interface InformationChannelOptions {
	/**
	 * The id of the information channel.
	 */
	id: Snowflake;
	/**
	 * Messages this information channel contains.
	 */
	messages: readonly InformationMessage[];
}

/**
 * A read-only information channel.
 */
export class InformationChannel {
	/**
	 * The id of the information channel.
	 */
	public readonly id: Snowflake;

	/**
	 * Messages this information channel contains.
	 */
	public readonly messages: readonly InformationMessage[];

	/**
	 * Creates a new information channel.
	 *
	 * @param options Options for the information channel.
	 */
	public constructor(options: InformationChannelOptions) {
		this.id = options.id;
		this.messages = options.messages;
	}
}
