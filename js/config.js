// Default config
var def_config = {
    musicVol: 0.5,
    sfxVol: 0.2,
}

// Check if Local Storage is accessable
if (typeof(Storage) !== "undefined") {
    if (!localStorage.getItem('adifolio-settings')) {
        // Stringify the config cuz that's how it is.
        localStorage.setItem("adifolio-settings", JSON.stringify(def_config));
        // Reload the page so that everything works.
        location.reload();
    }
} else {
    alert('Local Storage is not support or disabled -- settings will not work!')
}

// User config
var userConfig = JSON.parse(localStorage.getItem('adifolio-settings'));
console.log(`user config:`, userConfig);

// Default channels
var def_channels = [
    {
        id: 'aboutme',
        title: 'About Me',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_ABOUT_ME_LINK_OR_PAGE' // e.g., '/about.html'
    },
    {
        id: 'casestudy1',
        title: 'Case Study 1',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_CASE_STUDY_1_LINK' // (Research Agent)
    },
    {
        id: 'casestudy2',
        title: 'Case Study 2',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_CASE_STUDY_2_LINK' // (Credit Role Icon Survey)
    },
    {
        id: 'casestudy3',
        title: 'Case Study 3',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_CASE_STUDY_3_LINK' // (Data-Ink Ratio Analysis)
    },
    {
        id: 'spotify',
        title: 'Spotify',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_SPOTIFY_LINK'
    },
    {
        id: 'blog',
        title: 'Blog',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_BLOG_LINK'
    },
    {
        id: 'github',
        title: 'Github',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_GITHUB_PROFILE_LINK'
    },
    {
        id: 'photography',
        title: 'Photography',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_PHOTOGRAPHY_LINK' // (Instagram, etc.)
    },
    {
        id: 'linkedin',
        title: 'LinkedIn',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_LINKEDIN_LINK'
    },
    {
        id: 'resume',
        title: 'Resume',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'YOUR_RESUME_LINK' // (e.g., '/resume.pdf')
    },
    // Keep the original Photo Channel if you want its functionality,
    // but you listed 10 custom ones. If you want the original, you can add it back:
    // {
    //     id: 'photo',
    //     title: 'Photo Channel',
    //     assets: 'assets/channels/',
    //     channelart: 'channelart/'
    // },
]

// Set channels if they aren't set
if (!localStorage.getItem('adifolio-channels')) {
    localStorage.setItem("adifolio-channels", JSON.stringify(def_channels));
}
var userChannels = JSON.parse(localStorage.getItem('adifolio-channels'));
console.log(`user channels: `, userChannels);

// Load default config
function resetConfig(confirm) {
    if (confirm == true) {
        // Confirmed! writing...
        localStorage.setItem("adifolio-settings", JSON.stringify(def_config));
        userConfig = JSON.parse(localStorage.getItem('adifolio-settings'));
        console.log(`user config reset!:`, userConfig);
    } else {
        console.error(`loadDefaultConfig: MAKE SURE YOU'D LIKE TO DO THIS BY USING "loadDefaultConfig(true)". THERE'S NO TURNING BACK!!`)
    }
}

// Load default channels
function resetChannels(confirm) {
    if (confirm == true) {
        // Confirmed! writing...
        localStorage.setItem("adifolio-channels", JSON.stringify(def_channels));
        userChannels = JSON.parse(localStorage.getItem('adifolio-channels'));
        console.log(`user channels reset! (reload page to see):`, userChannels);
    } else {
        console.error(`loadDefaultChannels: MAKE SURE YOU'D LIKE TO DO THIS BY USING ADDING "true" IN THE FUNCTION. THERE'S NO TURNING BACK!!`)
    }
}