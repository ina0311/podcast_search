-- CreateTable
CREATE TABLE "Personality" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Personality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityAudioSample" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "personalityId" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "embedding" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalityAudioSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityPodcast" (
    "personalityId" INTEGER NOT NULL,
    "podcastId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalityPodcast_pkey" PRIMARY KEY ("personalityId","podcastId")
);

-- CreateTable
CREATE TABLE "EpisodePersonality" (
    "personalityId" INTEGER NOT NULL,
    "episodeId" INTEGER NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodePersonality_pkey" PRIMARY KEY ("personalityId","episodeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Personality_publicId_key" ON "Personality"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityAudioSample_publicId_key" ON "PersonalityAudioSample"("publicId");

-- AddForeignKey
ALTER TABLE "PersonalityAudioSample" ADD CONSTRAINT "PersonalityAudioSample_personalityId_fkey"
    FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityPodcast" ADD CONSTRAINT "PersonalityPodcast_personalityId_fkey"
    FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityPodcast" ADD CONSTRAINT "PersonalityPodcast_podcastId_fkey"
    FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodePersonality" ADD CONSTRAINT "EpisodePersonality_personalityId_fkey"
    FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodePersonality" ADD CONSTRAINT "EpisodePersonality_episodeId_fkey"
    FOREIGN KEY ("episodeId") REFERENCES "PodcastEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personality_updated_at
    BEFORE UPDATE ON "Personality"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
