-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `title` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `signature` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `owner` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssetGroup_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataAsset` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceDatabaseName` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `dataLevel` ENUM('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET') NOT NULL,
    `owner` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `tags` JSON NULL,
    `description` VARCHAR(191) NULL,
    `tableCount` INTEGER NOT NULL DEFAULT 0,
    `fieldCount` INTEGER NOT NULL DEFAULT 0,
    `sizeBytes` INTEGER NOT NULL DEFAULT 0,
    `recordCount` INTEGER NOT NULL DEFAULT 0,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `assetGroupId` VARCHAR(191) NOT NULL,
    `scanResultId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DataAsset_scanResultId_key`(`scanResultId`),
    INDEX `DataAsset_assetGroupId_idx`(`assetGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportTask` (
    `id` VARCHAR(191) NOT NULL,
    `sourceName` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `databaseName` VARCHAR(191) NULL,
    `sourceUsername` VARCHAR(191) NULL,
    `sourcePassword` VARCHAR(191) NULL,
    `assetGroupId` VARCHAR(191) NOT NULL,
    `dataAssetId` VARCHAR(191) NULL,
    `classificationTaskId` VARCHAR(191) NULL,
    `creatorId` VARCHAR(191) NULL,
    `scheduleMode` VARCHAR(191) NOT NULL DEFAULT 'single',
    `executeAt` DATETIME(3) NULL,
    `sampleCount` INTEGER NOT NULL DEFAULT 20,
    `sampleStrategy` VARCHAR(191) NOT NULL DEFAULT 'latest',
    `sampleStorageMode` VARCHAR(191) NOT NULL DEFAULT 'replace',
    `status` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `importedTableCount` INTEGER NOT NULL DEFAULT 0,
    `importedFieldCount` INTEGER NOT NULL DEFAULT 0,
    `importedRecordCount` INTEGER NOT NULL DEFAULT 0,
    `runClassificationImmediatelyAfterImport` BOOLEAN NOT NULL DEFAULT false,
    `classificationTriggeredAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImportTask_assetGroupId_idx`(`assetGroupId`),
    INDEX `ImportTask_dataAssetId_idx`(`dataAssetId`),
    INDEX `ImportTask_classificationTaskId_idx`(`classificationTaskId`),
    INDEX `ImportTask_creatorId_idx`(`creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataAssetTable` (
    `id` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `importTaskId` VARCHAR(191) NULL,
    `tableName` VARCHAR(191) NOT NULL,
    `tableComment` VARCHAR(191) NULL,
    `engine` VARCHAR(191) NULL,
    `rowCount` INTEGER NOT NULL DEFAULT 0,
    `sizeBytes` INTEGER NOT NULL DEFAULT 0,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DataAssetTable_assetId_idx`(`assetId`),
    INDEX `DataAssetTable_importTaskId_idx`(`importTaskId`),
    UNIQUE INDEX `DataAssetTable_assetId_tableName_key`(`assetId`, `tableName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataAssetColumn` (
    `id` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NOT NULL,
    `columnName` VARCHAR(191) NOT NULL,
    `columnComment` VARCHAR(191) NULL,
    `dataType` VARCHAR(191) NOT NULL,
    `columnType` VARCHAR(191) NOT NULL,
    `isNullable` BOOLEAN NOT NULL DEFAULT true,
    `isPrimaryKey` BOOLEAN NOT NULL DEFAULT false,
    `ordinalPosition` INTEGER NOT NULL,
    `sampleData` JSON NULL,
    `classificationDataTypeId` VARCHAR(191) NULL,
    `dataCategory` VARCHAR(191) NULL,
    `dataLevel` ENUM('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET') NULL,
    `isSensitive` BOOLEAN NOT NULL DEFAULT false,
    `needMask` BOOLEAN NOT NULL DEFAULT false,
    `needEncrypt` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DataAssetColumn_tableId_idx`(`tableId`),
    INDEX `DataAssetColumn_classificationDataTypeId_idx`(`classificationDataTypeId`),
    UNIQUE INDEX `DataAssetColumn_tableId_columnName_key`(`tableId`, `columnName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoScanRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cronExpression` VARCHAR(191) NULL,
    `assetGroupId` VARCHAR(191) NULL,
    `sourceType` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AutoScanRule_assetGroupId_idx`(`assetGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoScanResult` (
    `id` VARCHAR(191) NOT NULL,
    `scanRuleId` VARCHAR(191) NULL,
    `assetGroupId` VARCHAR(191) NULL,
    `sourceName` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `databaseName` VARCHAR(191) NULL,
    `owner` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
    `claimed` BOOLEAN NOT NULL DEFAULT false,
    `ignoreReason` VARCHAR(191) NULL,
    `ignoredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AutoScanResult_scanRuleId_idx`(`scanRuleId`),
    INDEX `AutoScanResult_assetGroupId_idx`(`assetGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassificationTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `templateName` VARCHAR(191) NOT NULL,
    `templateType` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassificationCategory` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassificationCategory_templateId_idx`(`templateId`),
    INDEX `ClassificationCategory_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassificationLevelDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `isSensitive` BOOLEAN NOT NULL DEFAULT false,
    `needMask` BOOLEAN NOT NULL DEFAULT false,
    `needEncrypt` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassificationLevelDefinition_templateId_idx`(`templateId`),
    UNIQUE INDEX `ClassificationLevelDefinition_templateId_code_key`(`templateId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassificationDataType` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `levelDefinitionId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `isSensitive` BOOLEAN NOT NULL DEFAULT false,
    `needMask` BOOLEAN NOT NULL DEFAULT false,
    `needEncrypt` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassificationDataType_templateId_idx`(`templateId`),
    INDEX `ClassificationDataType_categoryId_idx`(`categoryId`),
    INDEX `ClassificationDataType_levelDefinitionId_idx`(`levelDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassificationRule` (
    `id` VARCHAR(191) NOT NULL,
    `dataTypeId` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `matcher` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `hitRate` DECIMAL(5, 2) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassificationRule_dataTypeId_idx`(`dataTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassificationTask` (
    `id` VARCHAR(191) NOT NULL,
    `taskName` VARCHAR(191) NOT NULL,
    `dataSource` VARCHAR(191) NOT NULL,
    `dataAssetIds` JSON NULL,
    `dataType` VARCHAR(191) NOT NULL,
    `scheduleMode` VARCHAR(191) NOT NULL DEFAULT 'single',
    `classificationType` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `source` ENUM('CLASSIFICATION_CENTER', 'ASSET_IMPORT') NOT NULL DEFAULT 'CLASSIFICATION_CENTER',
    `sourceLabel` VARCHAR(191) NULL,
    `status` ENUM('WAITING_IMPORT', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `templateId` VARCHAR(191) NULL,
    `creatorId` VARCHAR(191) NULL,
    `executeAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassificationTask_templateId_idx`(`templateId`),
    INDEX `ClassificationTask_creatorId_idx`(`creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProtectionFeature` (
    `id` VARCHAR(191) NOT NULL,
    `featureType` ENUM('MASKING', 'ENCRYPTION') NOT NULL,
    `featureName` VARCHAR(191) NOT NULL,
    `featureCode` VARCHAR(191) NULL,
    `scene` VARCHAR(191) NULL,
    `featurePoint` VARCHAR(191) NOT NULL,
    `matcher` VARCHAR(191) NOT NULL,
    `confidence` INTEGER NOT NULL,
    `priority` INTEGER NULL,
    `expression` VARCHAR(191) NOT NULL,
    `sampleValue` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `description` VARCHAR(191) NULL,
    `creatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProtectionFeature_featureType_idx`(`featureType`),
    INDEX `ProtectionFeature_creatorId_idx`(`creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppBootstrapState` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('AUTH', 'ASSET_GROUP', 'IMPORT_TASK', 'CLASSIFICATION_TASK', 'AUTO_SCAN', 'TEMPLATE', 'PROTECTION_FEATURE') NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `result` ENUM('SUCCESS', 'FAILED', 'RUNNING', 'INFO') NOT NULL DEFAULT 'INFO',
    `actorId` VARCHAR(191) NULL,
    `actorName` VARCHAR(191) NULL,
    `targetType` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `targetName` VARCHAR(191) NULL,
    `detail` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_category_idx`(`category`),
    INDEX `AuditLog_result_idx`(`result`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssetGroup` ADD CONSTRAINT `AssetGroup_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `AssetGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataAsset` ADD CONSTRAINT `DataAsset_assetGroupId_fkey` FOREIGN KEY (`assetGroupId`) REFERENCES `AssetGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataAsset` ADD CONSTRAINT `DataAsset_scanResultId_fkey` FOREIGN KEY (`scanResultId`) REFERENCES `AutoScanResult`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportTask` ADD CONSTRAINT `ImportTask_assetGroupId_fkey` FOREIGN KEY (`assetGroupId`) REFERENCES `AssetGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportTask` ADD CONSTRAINT `ImportTask_dataAssetId_fkey` FOREIGN KEY (`dataAssetId`) REFERENCES `DataAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportTask` ADD CONSTRAINT `ImportTask_classificationTaskId_fkey` FOREIGN KEY (`classificationTaskId`) REFERENCES `ClassificationTask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportTask` ADD CONSTRAINT `ImportTask_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataAssetTable` ADD CONSTRAINT `DataAssetTable_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `DataAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataAssetTable` ADD CONSTRAINT `DataAssetTable_importTaskId_fkey` FOREIGN KEY (`importTaskId`) REFERENCES `ImportTask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataAssetColumn` ADD CONSTRAINT `DataAssetColumn_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `DataAssetTable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataAssetColumn` ADD CONSTRAINT `DataAssetColumn_classificationDataTypeId_fkey` FOREIGN KEY (`classificationDataTypeId`) REFERENCES `ClassificationDataType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoScanRule` ADD CONSTRAINT `AutoScanRule_assetGroupId_fkey` FOREIGN KEY (`assetGroupId`) REFERENCES `AssetGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoScanResult` ADD CONSTRAINT `AutoScanResult_scanRuleId_fkey` FOREIGN KEY (`scanRuleId`) REFERENCES `AutoScanRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoScanResult` ADD CONSTRAINT `AutoScanResult_assetGroupId_fkey` FOREIGN KEY (`assetGroupId`) REFERENCES `AssetGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationCategory` ADD CONSTRAINT `ClassificationCategory_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ClassificationTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationCategory` ADD CONSTRAINT `ClassificationCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ClassificationCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationLevelDefinition` ADD CONSTRAINT `ClassificationLevelDefinition_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ClassificationTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationDataType` ADD CONSTRAINT `ClassificationDataType_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ClassificationTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationDataType` ADD CONSTRAINT `ClassificationDataType_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ClassificationCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationDataType` ADD CONSTRAINT `ClassificationDataType_levelDefinitionId_fkey` FOREIGN KEY (`levelDefinitionId`) REFERENCES `ClassificationLevelDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationRule` ADD CONSTRAINT `ClassificationRule_dataTypeId_fkey` FOREIGN KEY (`dataTypeId`) REFERENCES `ClassificationDataType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationTask` ADD CONSTRAINT `ClassificationTask_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ClassificationTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassificationTask` ADD CONSTRAINT `ClassificationTask_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProtectionFeature` ADD CONSTRAINT `ProtectionFeature_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
