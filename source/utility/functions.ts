import type { Snowflake } from "@discordjs/core";

function timestampFromSnowflake(snowflake: Snowflake) {
	return Number(BigInt(snowflake) >> 22n) + 1_420_070_400_000;
}

export function isBulkDeletable(messageId: Snowflake) {
	return Date.now() - timestampFromSnowflake(messageId) < 1_209_600_000;
}
