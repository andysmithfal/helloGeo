Tasks = new Mongo.Collection("tasks");
Profiles = new Mongo.Collection("profiles");

if (Meteor.isClient) {
    // This code only runs on the client
    //var recentCheckIns = new Mongo.Collection("recentCheckIns");
    Meteor.subscribe("recentCheckIns");

    Meteor.startup(function() {
        //
    });

    Template.registerHelper("recentCheckIns",function(){
        time = new Date();
        var maxtime = new Date(time - 1000 * 60 * 60 * 16);
        return Tasks.find({
                createdAt: {
                    $gt: maxtime
                }
            },
            {
                sort: {
                    createdAt: -1
                }
            });
    });

    Template.home.rendered = function(){
        GoogleMaps.load();
    };

    Template.home.helpers({
        tasks: function () {
            return UI._globalHelpers.recentCheckIns();
        },
        numberOfCheckins: function () {
            return Tasks.find({}).count();
        },
        loc: function () {
            // return 0, 0 if the location isn't ready
            return Geolocation.latLng() || { lat: 0, lng: 0 };
        },
        exampleMapOptions: function() {
            // Make sure the maps API has loaded
            if (GoogleMaps.loaded()) {
                // Map initialization options
                return {
                    center: new google.maps.LatLng(50.158399799999996,-5.0923081),
                    zoom: 13,
                    disableDefaultUI: true,
                    zoomControl: true,
                    scrollwheel: false,
                    styles: [
                        {
                            "stylers": [
                                { "visibility": "off" }
                            ]
                        },{
                            "featureType": "road",
                            "elementType": "geometry",
                            "stylers": [
                                { "color": "#ffffff" },
                                { "visibility": "simplified" }
                            ]
                        },{
                            "featureType": "water",
                            "elementType": "geometry",
                            "stylers": [
                                //{ "color": "#05a1f4" },
                                { "color": "#ffffff" },
                                { "visibility": "on" }
                            ]
                        },{
                            "featureType": "landscape",
                            "elementType": "geometry",
                            "stylers": [
                                { "visibility": "on" },
                                { "color": "#000000" }
                            ]
                        },{
                            "featureType": "administrative",
                            "elementType": "labels.text.fill",
                            "stylers": [
                                { "visibility": "on" },
                                { "hue": "#ff2b00" },
                                { "saturation": 100 },
                                { "weight": 2.5 },
                                { "lightness": 100 }
                            ]
                        }
                    ]
                };
            }
        }
    });

    Template.home.events({
        "submit .new-task": function (event) {
            // This function is called when the new task form is submitted
            var text = event.target.text.value;
            var location = Geolocation.latLng();
            var type = event.target.performanceType.value;
            var successfulLocation = false;

            if(location == null){
                console.log("failed to get position");
                return false;
            }else{
                console.log("success?");
                console.log(location.lat);
                console.log(location.lng);
                successfulLocation = true;
            }

            if(successfulLocation){
                Meteor.call("checkIn", text, location.lat, location.lng, type, function(error, result){
                    //do something?
                });
            }


            // Clear form
            event.target.text.value = "";

            // Prevent default form submit
            return false;
        }
    });

    Template.task.events({
        "click .delete": function () {
            Meteor.call("deleteCheckIn", this._id);

        }
    });

    Template.task.helpers({
        date: function(){
            return moment(this.createdAt).fromNow();
        },
        isOwner: function () {
            return this.owner === Meteor.userId();
        }
    });
    Template.editprofile.rendered = function(){
       //Meteor.subscribe('userProfile', Meteor.user().username);

        //console.log("subscribing to " + Meteor.user().username);
    };
    Template.editprofile.helpers({
        getProfile: function() {
            Meteor.subscribe('userProfile', Meteor.user().username);
            return Profiles.findOne({username: Meteor.user().username});
        }

    });

    Template.editprofile.events({
        'submit .editProfile': function(event){
            var newProfileText = event.target.profiletext.value;
            Meteor.call("updateProfile", newProfileText);
            return false;
        }
    });
    Template.home.onCreated(function() {
        // We can use the `ready` callback to interact with the map API once the map is ready.
        GoogleMaps.ready('exampleMap', function(map) {


            infowindow = new google.maps.InfoWindow({
                content: "Loading..."
            });

            UI._globalHelpers.recentCheckIns().observeChanges({
                added: function(id,fields){

                    addMarker(fields.lat, fields.lng, fields.username, fields.createdAt, fields.text,fields.performanceType);
                }
            });

            function addMarker(lat,lng,user,time,text,type){
                var latlng = new google.maps.LatLng(lat,lng);
                var icon;

                switch(type){
                    case "music":
                        icon = 'images/icon-new-music.png';
                        break;
                    case "theatre":
                        icon = 'images/icon-new-theater.png';
                        break;
                    case "painting":
                        icon = 'images/icon-new-painting.png';
                        break;
                    case "markets":
                        icon = 'images/icon-new-markets.png';
                        break;
                    case "alternative":
                        icon = 'images/icon-new-alternative.png';
                        break;
                    default:
                        icon = 'images/icon-new-other.png';
                        break;
                }

                var marker = new google.maps.Marker({
                    position: latlng,
                    icon: icon,
                    map: map.instance
                });
                addInfoWindow(marker, map, user, time, text);
            }

            function addInfoWindow(marker2, map, name, time, text){
                google.maps.event.addListener(marker2, 'click', function() {
                    infowindow.setContent("<strong>"+name+"</strong><br>"+text+"<br>"+moment(time).fromNow());
                    infowindow.open(map.instance,marker2);
                });
            }

        });
    });

    Template.profile.onCreated(function(){
        var route = Router.current();
        var user = route.params.username;
        Meteor.subscribe("allCheckInsForUser", user);
        Meteor.call("getPublicProfile", user, function(error,res){
            Session.set("profilebio",res);
        });
    });

    Template.profile.helpers({
        usercheckins: function () {
            return Tasks.find({username: Router.current().params.username}, {sort: {createdAt: -1}});
        },
        userprofile: function () {
            return Session.get("profilebio") || "Error getting user profile";
        }
    });



    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });

}

if(Meteor.isServer){
    Meteor.publish("recentCheckIns",function(){
        time = new Date();
        var maxtime = new Date(time - 1000 * 60 * 60 * 16);
        return Tasks.find({
                createdAt: {
                    $gt: maxtime
                }
            },
            {
                sort: {
                    createdAt: -1
                }
            });
    });
    Meteor.publish("allCheckIns",function(){
        return Tasks.find();
    });
    Meteor.publish("allCheckInsForUser",function(user){
        return Tasks.find({username: user});
    });
    Meteor.publish("userProfile",function(user){
        return Profiles.find({username: user});
    });

    Meteor.methods({
        getPublicProfile: function(username){
            return Profiles.findOne({username: username}).profiletext;

        },
        updateProfile: function (newProfileText) {
            // Make sure the user is logged in before inserting a task
            if (! Meteor.userId()) {
                throw new Meteor.Error("not-authorized");
            }

            if(Profiles.findOne({username: Meteor.user().username})){
                Profiles.update(
                    {username: Meteor.user().username},
                    {$set: {
                        profiletext: newProfileText
                    }
                    });
            } else {
                Profiles.insert({
                    username: Meteor.user().username,
                    profiletext: newProfileText
                });
            }
            return true;
        },
        checkIn: function(text,glat,glng,type){
            if (! Meteor.userId()) {
                throw new Meteor.Error("not-authorized");
            }
            Tasks.insert({
                text: text,
                createdAt: new Date(),            // current time
                owner: Meteor.userId(),           // _id of logged in user
                username: Meteor.user().username,  // username of logged in user
                lat: glat,  //latitude
                lng: glng,   //longitude
                performanceType: type //performance type
            });
        },
        deleteCheckIn: function(id){
            var taskToDelete = Tasks.findOne(id);
            if(taskToDelete.owner !== Meteor.userId()){
                throw new Meteor.Error("not-authorised");
            }
            Tasks.remove(id);
        }
    });
}

Router.map(function () {
    this.route('home', {
        path: '/',  //overrides the default '/home'
    });

    this.route('profile', {
        path: '/profile/:username',
        data: function () {
            return Meteor.users.findOne({username: this.params.username})
        },
        template: 'profile'
    });

    this.route('editprofile');
});