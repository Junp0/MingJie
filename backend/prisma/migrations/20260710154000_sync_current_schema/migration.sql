-- DropForeignKey
ALTER TABLE `DataAssetTable` DROP FOREIGN KEY `DataAssetTable_assetId_fkey`;

-- DropForeignKey
ALTER TABLE `ImportTask` DROP FOREIGN KEY `ImportTask_parentId_fkey`;

-- DropIndex
DROP INDEX `DataAssetTable_assetId_tableName_key` ON `DataAssetTable`;

-- DropIndex
DROP INDEX `ImportTask_parentId_idx` ON `ImportTask`;

-- AlterTable
ALTER TABLE `AuditLog` MODIFY `category` ENUM('AUTH', 'ASSET_GROUP', 'IMPORT_TASK', 'CLASSIFICATION_TASK', 'AUTO_SCAN', 'TEMPLATE', 'PROTECTION_FEATURE', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT') NOT NULL;

-- AlterTable
ALTER TABLE `AutoScanRule` ADD COLUMN `lastScannedAt` DATETIME(3) NULL,
    ADD COLUMN `scanProgress` INTEGER NULL,
    ADD COLUMN `scanStatus` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `DataAsset` DROP COLUMN `sourceDatabaseName`;

-- AlterTable
ALTER TABLE `DataAssetTable` ADD COLUMN `databaseName` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `ImportTask` DROP COLUMN `parentId`,
    ADD COLUMN `databaseNames` JSON NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `role`,
    ADD COLUMN `roleId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `permissions` JSON NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    UNIQUE INDEX `Role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `DataAssetTable_assetId_databaseName_tableName_key` ON `DataAssetTable`(`assetId`, `databaseName`, `tableName`);

-- CreateIndex
CREATE INDEX `User_roleId_idx` ON `User`(`roleId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
