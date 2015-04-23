Tasks = new Mongo.Collection("tasks");
Profiles = new Mongo.Collection("profiles");

if (Meteor.isClient) {
    // This code only runs on the client

    //populates the client-side database with only the most recent check-ins
    Meteor.subscribe("recentCheckIns");

    //global helper function to retrieve the last 16 hours of check-ins
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

    //load the google maps view when the home template has fully rendered
    Template.home.rendered = function(){
        GoogleMaps.load();
    };

    //helper functions for the home page template
    //these functions return data when called by the template
    Template.home.helpers({
        //get the recent tasks from the database by calling the global helper
        tasks: function () {
            return UI._globalHelpers.recentCheckIns();
        },
        //count the checkins in the database and return a number
        numberOfCheckins: function () {
            return Tasks.find({}).count();
        },
        loc: function () {
            // return 0, 0 if the location isn't ready
            return Geolocation.latLng() || { lat: 0, lng: 0 };
        },
        //initialise the google maps view with some options
        //this also contains the map styles object
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

    //events for the home template
    //these are functions that are executed automatically when certain things happen
    Template.home.events({
        //called when a new check-in is submitted
        "submit .new-task": function (event) {
            var text = event.target.text.value;
            var location = Geolocation.latLng();
            var type = event.target.performanceType.value;
            var successfulLocation = false;

            if(location == null){
                //we're going to reject this check-in because there's no geolocation info
                //this might be because the user denied a request to access positional data,
                //or data is still being acquired and isn't ready yet
                console.log("failed to get position");
                return false;
            }else{
                successfulLocation = true;
            }

            if(successfulLocation){
                //call the server-side method 'checkIn', which will insert the checkin into the database
                //the client is not allowed to alter the database becuase we removed the 'insecure' package
                Meteor.call("checkIn", text, location.lat, location.lng, type, function(error, result){
                    //this code will be executed when the server replies to the insertion request
                    //if error == false, display successful checkin message?
                });
            }


            // Clear form
            event.target.text.value = "";

            // Prevent default form submit
            return false;
        }
    });

    //TASK TEMPLATE
    //this templated is used within other templates to display a task
    //(currently on the home page + profile pages)
    Template.task.events({
        "click .delete": function () {
            //send a request to the deleteCheckIn method to remove the checkin
            //from the database
            Meteor.call("deleteCheckIn", this._id);

        }
    });

    Template.task.helpers({
        //return a nicely presented data e.g. '7 minutes ago'
        date: function(){
            return moment(this.createdAt).fromNow();
        },
        //returns true if the current task was created by the currently logged in user
        isOwner: function () {
            return this.owner === Meteor.userId();
        }
    });

    //EDITPROFILE TEMPLATE

    Template.editprofile.rendered = function(){

    };

    Template.editprofile.helpers({
        //gets the profile info for a specified username
        getProfile: function() {
            //subscribe to a userprofile collection consisting of the requested user profile
            Meteor.subscribe('userProfile', Meteor.user().username);
            return Profiles.findOne({username: Meteor.user().username});
        }

    });

    Template.editprofile.events({
        //Called when user hits submit after editing their profile
        'submit .editProfile': function(event){
            //get the new profile text
            var newProfileText = event.target.profiletext.value;
            //call a meteor server-side method to update the database with the new text
            Meteor.call("updateProfile", newProfileText);
            //prevent a page reload when the form is submitted
            return false;
        }
    });


    //HOME TEMPLATE
    //this function is called when the home page is loaded
    //it mainly deals with adding markers to the google map
    Template.home.onCreated(function() {

        // We can use the `ready` callback to interact with the map API once the map is ready.
        GoogleMaps.ready('exampleMap', function(map) {

            //initialise an info window - we only use one info window, its position and content are changed depending on
            //which marker is clicked on
            infowindow = new google.maps.InfoWindow({
                content: "Loading..."
            });

            //we attach an 'observeChanges' listener on the recentCheckIns collection
            //functions specified here are executed automatically when the collection changes in certain ways
            UI._globalHelpers.recentCheckIns().observeChanges({
                //this function is called when a new item is added
                //this includes when the page first loads and the collection is initially populated
                //it receives two arguments - an id and the contents of the database record ('fields')
                added: function(id,fields){
                    //calls the function below to add a google maps marker for each check-in
                    addMarker(fields.lat, fields.lng, fields.username, fields.createdAt, fields.text,fields.performanceType);
                }
            });
            //this function adds the marker to the map
            function addMarker(lat,lng,user,time,text,type){
                //form a google maps LatLng object by supplying the lat and lng from the check-in
                //we'll pass this to the marker later on
                var latlng = new google.maps.LatLng(lat,lng);

                //decide what icon to assign to the marker by looking at the performanceType attribute
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

                //finally, add the marker to the map
                var marker = new google.maps.Marker({
                    position: latlng,
                    icon: icon,
                    map: map.instance
                });
                //calls the function below to add an info window to the marker
                addInfoWindow(marker, map, user, time, text);
            }

            function addInfoWindow(marker2, map, name, time, text){
                //assign an event listener to the marker we just created - the function will be executed
                //when the marker is clicked
                google.maps.event.addListener(marker2, 'click', function() {
                    //update the text in the info window
                    infowindow.setContent("<strong>"+name+"</strong><br>"+text+"<br>"+moment(time).fromNow());
                    //open the info window
                    infowindow.open(map.instance,marker2);
                });
            }

        });
    });

    Template.profile.onCreated(function(){
        //read the username of the requested profile from the URL
        //      (/profile/username)
        var user = Router.current().params.username;
        //subscribe to collection all checkins for that user
        Meteor.subscribe("allCheckInsForUser", user);
        //call the meteor method to return that user's profile
        Meteor.call("getPublicProfile", user, function(error,res){
            //when the server replies, store their bio in a session variable
            Session.set("profilebio",res);
        });
    });

    Template.profile.helpers({
        usercheckins: function () {
            //return a list of checkins for the specified user
            return Tasks.find({username: Router.current().params.username}, {sort: {createdAt: -1}});
        },
        userprofile: function () {
            //return the session variable containing the profile bio that we set using the callback 'getPublicProfile'
            //we do it this way because Meteor.call is asynchronous
            return Session.get("profilebio") || "Error getting user profile";
        }
    });


    //configure the accounts package
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });

}

//this code is only run on the server
if(Meteor.isServer){
    //published collections
    //the server accesses the full database and sends certain collections
    //to the client, sometimes containing a subset of information.
    //the client obtains this information by calling Meteor.subscribe();
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

    //these are server side functions that the client can access by
    //calling Meteor.call();
    Meteor.methods({
        getPublicProfile: function(username){
            return Profiles.findOne({username: username}).profiletext;

        },
        updateProfile: function (newProfileText) {
            //this is called to update the user profile

            // Make sure the user is logged in
            if (! Meteor.userId()) {
                //throw an error if user is not logged in
                throw new Meteor.Error("not-authorized");
            }
            //check if the user has an entry in the profiles collection already
            if(Profiles.findOne({username: Meteor.user().username})){
                //if the user DOES have a record, we'll update that instead of creating a new one
                Profiles.update(
                    {username: Meteor.user().username},
                    {$set: {
                        profiletext: newProfileText
                    }
                    });
            } else {
                //they don't have a profile already - lets make one
                Profiles.insert({
                    username: Meteor.user().username,
                    profiletext: newProfileText
                });
            }
            return true;
        },
        checkIn: function(text,glat,glng,type){
            //add a new checkin to the database
            //check if the user is logged in
            if (! Meteor.userId()) {
                throw new Meteor.Error("not-authorized");
            }
            //insert the checkin into the database
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
            //delete a checkin
            //first find the checkin
            var taskToDelete = Tasks.findOne(id);
            //check if the checkin's owner is the currently logged in user
            if(taskToDelete.owner !== Meteor.userId()){
                throw new Meteor.Error("not-authorised");
            }
            //remove the checkin
            Tasks.remove(id);
        }
    });
}

//this section configures the iron router
Router.map(function () {
    //home page
    this.route('home', {
        path: '/',  //overrides the default '/home' and makes the page available at /
    });
    //profile page
    this.route('profile', {
        path: '/profile/:username', //specify a URL parameter
        data: function () { //this gives data to our template
            return Meteor.users.findOne({username: this.params.username}) //pull info from the database using the specified username
        },
        template: 'profile'
    });
    //define the editprofile page - we don't need to set any further options
    this.route('editprofile');
});