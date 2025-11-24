import {
	type APIComponentInMessageActionRow,
	type APIMessageTopLevelComponent,
	ComponentType,
	type Snowflake,
} from "@discordjs/core";

function timestampFromSnowflake(snowflake: Snowflake) {
	return Number(BigInt(snowflake) >> 22n) + 1_420_070_400_000;
}

export function isBulkDeletable(messageId: Snowflake) {
	return Date.now() - timestampFromSnowflake(messageId) < 1_209_600_000;
}

export function isComponentsDifferent(
	components: readonly (APIMessageTopLevelComponent | APIComponentInMessageActionRow)[],
	localComponents: readonly (APIMessageTopLevelComponent | APIComponentInMessageActionRow)[],
) {
	if (components.length !== localComponents.length) {
		return true;
	}

	for (let index = 0; index < components.length; index++) {
		const component = components[index]!;
		const localComponent = localComponents[index]!;

		if (component.type !== localComponent.type) {
			return true;
		}

		if (component.type === ComponentType.ActionRow) {
			if (
				isComponentsDifferent(component.components, (localComponent as typeof component).components)
			) {
				return true;
			}

			continue;
		}

		if (component.type === ComponentType.Container) {
			if (
				isComponentsDifferent(component.components, (localComponent as typeof component).components)
			) {
				return true;
			}

			continue;
		}

		if (component.type === ComponentType.Button) {
			if (component.style !== (localComponent as typeof component).style) {
				return true;
			}

			if (
				"custom_id" in component &&
				component.custom_id !== (localComponent as typeof component).custom_id
			) {
				return true;
			}

			if ("url" in component && component.url !== (localComponent as typeof component).url) {
				return true;
			}

			if ("label" in component && component.label !== (localComponent as typeof component).label) {
				return true;
			}

			continue;
		}

		if (
			component.type === ComponentType.TextDisplay &&
			component.content !== (localComponent as typeof component).content
		) {
			return true;
		}
	}

	return false;
}
