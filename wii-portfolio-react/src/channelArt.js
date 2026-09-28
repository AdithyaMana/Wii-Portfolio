// Phones and other portrait screens show a channel's tall art when it has
// one (channel.mobileart). Keep this query in step with the matching rule
// in index.css.
export const MOBILE_ART_QUERY = '(max-aspect-ratio: 3/4)';

export const mobileArtSrc = (channel) => `/${channel.assets}${channel.id}/video-mobile.webp`;

// The preview a channel will show on this screen, for preloading
export function previewSrc(channel) {
    if (channel.mobileart && window.matchMedia(MOBILE_ART_QUERY).matches) return mobileArtSrc(channel);
    return `/${channel.assets}${channel.id}/video.${channel.videoformat || 'gif'}`;
}
