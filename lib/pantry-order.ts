import { sql } from 'drizzle-orm';
import { pantryItems } from '@/db/schema';
import { PANTRY_STATUS_RANK } from '@/lib/pantry-status';

/**
 * ORDER BY expression mirroring PANTRY_STATUS_RANK, so the server returns rows
 * already grouped the way the client renders them. Built from the shared rank
 * map rather than relying on the statuses happening to sort alphabetically.
 */
export const pantryStatusRank = sql`case ${pantryItems.status} ${sql.raw(
  Object.entries(PANTRY_STATUS_RANK)
    .map(([status, rank]) => `when '${status}' then ${rank}`)
    .join(' ')
)} else 99 end`;
