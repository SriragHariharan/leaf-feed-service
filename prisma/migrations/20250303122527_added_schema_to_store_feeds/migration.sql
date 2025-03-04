-- CreateTable
CREATE TABLE `User` (
    `userID` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `profilePic` VARCHAR(191) NULL,

    PRIMARY KEY (`userID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `postID` VARCHAR(191) NOT NULL,
    `imageURL` VARCHAR(191) NULL,
    `content` VARCHAR(191) NOT NULL,
    `ownerID` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`postID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Timeline` (
    `id` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(191) NOT NULL,
    `postID` VARCHAR(191) NOT NULL,
    `isLiked` BOOLEAN NOT NULL DEFAULT false,
    `isCommented` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Timeline_userID_postID_key`(`userID`, `postID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_ownerID_fkey` FOREIGN KEY (`ownerID`) REFERENCES `User`(`userID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timeline` ADD CONSTRAINT `Timeline_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`userID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timeline` ADD CONSTRAINT `Timeline_postID_fkey` FOREIGN KEY (`postID`) REFERENCES `Post`(`postID`) ON DELETE CASCADE ON UPDATE CASCADE;
