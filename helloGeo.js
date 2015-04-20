Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
  // This code only runs on the client

  Meteor.startup(function() {
    GoogleMaps.load();
  });

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        var tasks = Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}})
      } else {
        // Otherwise, return all of the tasks
        var tasks = Tasks.find({}, {sort: {createdAt: -1}});
      } 
        return tasks;

    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
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
        center: new google.maps.LatLng(50.168399799999996,-5.1223081),
        zoom: 13
      };
    }
  }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // This function is called when the new task form is submitted
      var text = event.target.text.value;
      var location = Geolocation.latLng();

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
          lng: location.lng   //longitude
        });

      }


      // Clear form
      event.target.text.value = "";

      // Prevent default form submit
      return false;
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Tasks.update(this._id, {$set: {checked: ! this.checked}});
    },
    "click .delete": function () {
      Tasks.remove(this._id);
    }
  });

  Template.body.onCreated(function() {
    // We can use the `ready` callback to interact with the map API once the map is ready.
    GoogleMaps.ready('exampleMap', function(map) {
      // Add a marker to the map once it's ready
      var tasks = Tasks.find().fetch();
      console.dir(tasks);


      infowindow = new google.maps.InfoWindow({
                content: "Loading..."
            });

      for(i = 0; i < tasks.length; i++){
        console.log(tasks[i].lat);
        var latlng = new google.maps.LatLng(tasks[i].lat,tasks[i].lng);
        var marker = new google.maps.Marker({
          position: latlng,
          map: map.instance
        });
        console.log("marker "+i+": ");
        console.dir(marker);
        openInfoWindow(marker, map, tasks[i].username, tasks[i].createdAt, tasks[i].text);
      }

      function openInfoWindow(marker2, map, name, time, text){
        google.maps.event.addListener(marker2, 'click', function() {
          infowindow.setContent("<strong>"+name+"</strong><br>"+text+"<br>"+time);
          console.dir(marker2);

          infowindow.open(map.instance,marker2);
          //infowindow.open();
        });
      }

    });
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  }); 


  //non-meteor globals
  //var infowindow = null;
}