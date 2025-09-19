-- DropIndex
DROP INDEX `refresh_tokens_token_key` ON `refresh_tokens`;

-- AlterTable
ALTER TABLE `refresh_tokens` MODIFY `token` TEXT NOT NULL;
