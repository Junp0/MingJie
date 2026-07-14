ALTER TABLE `ClassificationRule`
  MODIFY `hitRate` DECIMAL(5, 2) NULL;

UPDATE `ClassificationRule`
SET `hitRate` = NULL
WHERE `target` <> 'sampleData';
