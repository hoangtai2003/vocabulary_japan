/*
  Warnings:

  - Added the required column `goal` to the `daily_new_words` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `daily_new_words` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "daily_new_words" ADD COLUMN     "goal" INTEGER NOT NULL,
ADD COLUMN     "level" "JlptLevel" NOT NULL;
