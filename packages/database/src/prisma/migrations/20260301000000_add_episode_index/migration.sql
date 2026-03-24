-- AddIndex
-- PodcastEpisode(podcastId, publishedAt DESC) インデックスを追加
-- 番組別エピソード一覧を新着順で取得するクエリを高速化する
CREATE INDEX "PodcastEpisode_podcastId_publishedAt_idx" ON "PodcastEpisode"("podcastId", "publishedAt" DESC);
