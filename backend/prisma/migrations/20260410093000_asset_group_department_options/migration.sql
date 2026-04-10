CREATE TABLE `AssetGroupDepartment` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AssetGroupDepartment_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `AssetGroupDepartment` (`id`, `name`, `createdAt`, `updatedAt`)
SELECT
    REPLACE(UUID(), '-', ''),
    `department`,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `AssetGroup`
WHERE `department` IS NOT NULL AND TRIM(`department`) <> ''
GROUP BY `department`;

ALTER TABLE `AssetGroup` DROP COLUMN `status`;
