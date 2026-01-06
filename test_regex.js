
const getYoutubeVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const urls = [
    "https://www.youtube.com/watch?v=HPPQDpdRrCI",
    "https://youtu.be/HPPQDpdRrCI",
    "https://www.youtube.com/embed/HPPQDpdRrCI",
    "https://www.youtube.com/shorts/HPPQDpdRrCI",
    "https://youtube.com/live/HPPQDpdRrCI"
];

urls.forEach(url => {
    console.log(`URL: ${url} => ID: ${getYoutubeVideoId(url)}`);
});
