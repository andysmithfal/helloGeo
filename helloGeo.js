Tasks = new Mongo.Collection("tasks");


if (Meteor.isClient) {
  // This code only runs on the client

  Meteor.startup(function() {
    //
  });

  Template.home.rendered = function(){
    GoogleMaps.load();
  };

  Template.home.helpers({
    tasks: function () {
      return Tasks.find({}, {sort: {createdAt: -1}});
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
        styles = [];
        return {
          center: new google.maps.LatLng(50.158399799999996,-5.0923081),
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
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
                { "color": "#05a1f4" },
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
      }else{
        console.log("success?");
        console.log(location.lat);
        console.log(location.lng);
        successfulLocation = true;
      }

      if(successfulLocation){
        Tasks.insert({
          text: text,
          createdAt: new Date(),            // current time
          owner: Meteor.userId(),           // _id of logged in user
          username: Meteor.user().username,  // username of logged in user
          lat: location.lat,  //latitude
          lng: location.lng,   //longitude
          performanceType: type //performance type
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
      Tasks.remove(this._id);
    }
  });

  Template.task.helpers({
    date: function(){
      return moment(this.createdAt).fromNow();
    }
  });

  Template.home.onCreated(function() {
    // We can use the `ready` callback to interact with the map API once the map is ready.
    GoogleMaps.ready('exampleMap', function(map) {

      // Add a marker to the map once it's ready
      var tasks = Tasks.find().fetch();

      infowindow = new google.maps.InfoWindow({
                content: "Loading..."
            });

      for(i = 0; i < tasks.length; i++){
        var latlng = new google.maps.LatLng(tasks[i].lat,tasks[i].lng);

        var icon;

        switch(tasks[i].performanceType){
          case "music":
                icon = 'images/map-icon-music.png';
          break;
          case "theatre":
                icon = 'images/map-icon-theatre.png';
          break;
          case "painting":
                icon = 'images/map-icon-painting.png';
          break;
          default:
                icon = 'images/map-icon-default.png';
          break;
        }

        var marker = new google.maps.Marker({
          position: latlng,
          icon: icon,
          map: map.instance
        });
        openInfoWindow(marker, map, tasks[i].username, tasks[i].createdAt, tasks[i].text);
      }

      function openInfoWindow(marker2, map, name, time, text){
        google.maps.event.addListener(marker2, 'click', function() {
          infowindow.setContent("<strong>"+name+"</strong><br>"+text+"<br>"+moment(time).fromNow());
          infowindow.open(map.instance,marker2);
          //infowindow.open();
        });
      }

    });
  });

  Template.profile.helpers({
    usercheckins: function () {
      return Tasks.find({username: this.username}, {sort: {createdAt: -1}})
    }
  });



  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
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

});