// Phones and other portrait screens show a channel's tall art when it has
// one (channel.mobileart). Keep this query in step with the matching rule
// in index.css.
export const MOBILE_ART_QUERY = '(max-aspect-ratio: 3/4)';

// Channel art is served with a year-long immutable cache (vercel.json), so
// every art URL carries this version. Bump it whenever the art is
// republished, or returning visitors keep seeing the old art.
export const ART_VERSION = '2026-09-28';
export const artUrl = (path) => `${path}?v=${ART_VERSION}`;

export const mobileArtSrc = (channel) => artUrl(`/${channel.assets}${channel.id}/video-mobile.webp`);

// The preview a channel will show on this screen, for preloading
export function previewSrc(channel) {
    if (channel.mobileart && window.matchMedia(MOBILE_ART_QUERY).matches) return mobileArtSrc(channel);
    return artUrl(`/${channel.assets}${channel.id}/video.${channel.videoformat || 'gif'}`);
}
