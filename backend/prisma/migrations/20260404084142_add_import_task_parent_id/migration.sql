-- AlterTable
ALTER TABLE `ImportTask` ADD COLUMN `parentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ImportTask_parentId_idx` ON `ImportTask`(`parentId`);

-- AddForeignKey
ALTER TABLE `ImportTask` ADD CONSTRAINT `ImportTask_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ImportTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
