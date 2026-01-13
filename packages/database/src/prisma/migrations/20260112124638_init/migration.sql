-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('PUBLISHED', 'PRIVATE', 'REMOVED', 'DRAFT');

-- CreateTable
CREATE TABLE "PodcastEpisode" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL,
    "podcastId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "enclosureUrl" TEXT NOT NULL,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'PUBLISHED',
    "visibilityChangedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "description" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Podcast" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "rssUrl" TEXT,
    "author" TEXT,
    "language" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Podcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL,
    "episodeId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "language" TEXT,
    "speakerLabel" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PodcastEpisode_publicId_key" ON "PodcastEpisode"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "PodcastEpisode_podcastId_enclosureUrl_key" ON "PodcastEpisode"("podcastId", "enclosureUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Podcast_publicId_key" ON "Podcast"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptSegment_publicId_key" ON "TranscriptSegment"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptSegment_episodeId_startMs_endMs_key" ON "TranscriptSegment"("episodeId", "startMs", "endMs");

-- AddForeignKey
ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "PodcastEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
