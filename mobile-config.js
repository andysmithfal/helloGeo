/**
 * Created by andysmith on 22/04/15.
 */

App.info({
    id: 'io.fal.urbanow',
    name: 'urbanow',
    description: 'Discover local performances',
    author: 'Andy Smith'
});

App.icons({
    // iOS
    'iphone': 'resources/icons/icon-60x60.png',
    'iphone_2x': 'resources/icons/icon-60x60@2x.png',
    'ipad': 'resources/icons/icon-72x72.png',
    'ipad_2x': 'resources/icons/icon-72x72@2x.png'
});

App.launchScreens({
    // iOS
    'iphone': 'resources/splash/splash-320x480.png',
    'iphone_2x': 'resources/splash/splash-320x480@2x.png',
    'iphone5': 'resources/splash/splash-320x568@2x.png'

});

//App.setPreference('fullscreen', true);
App.accessRule('*.google.com/*');
App.accessRule('*.googleapis.com/*');
App.accessRule('*.gstatic.com/*');