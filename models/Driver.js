
'use strict';
const helpers = require('../helpers/Helpers');

class Driver {

    constructor(m) {

        /*---------------------------------------
        | d_ = DRIVER , p_ = PASSENGER
        |---------------------------------------*/
        this.driver_ua_number         =   m.driver_ua_number || null;

        this.passenger_ua_number      =   m.passenger_ua_number || null;

        this.ride_status_desc         =   m.ride_status_desc || null;

        this.trip_done                =   m.trip_done || 0;

        this.driver_fullname         =   m.driver_fullname || null;

        this.passenger_fullname      =   m.passenger_fullname || null;

        this.plate_number             =   m.plate_number || null;

        this.client_type              =   m.client_type || null;

        // DRIVER
        this.d_lat                    =   m.d_lat || null;

        this.d_longt                  =   m.d_longt || null;

        this.default_radius           =   m.default_radius || null;

        this.bearing                  =   m.bearing || null;

        // PASSENGER
        this.p_origin_lat             =   m.p_origin_lat || null;

        this.p_origin_longt           =   m.p_origin_longt || null;

        this.p_destination_lat        =   m.p_destination_lat || null;

        this.p_destination_longt      =   m.p_destination_longt || null;

        this.p_destination_address      =   m.p_destination_address || null;

        this.p_origin_address      =   m.p_origin_address || null;

        this.p_destination_distance      =   m.p_destination_distance || null;

        this.p_destination_eta      =   m.p_destination_eta || null;

        this.current_lat              =   null;

        this.current_longt            =   null;

        this.destination_lat          =   null;

        this.destination_longt        =   null;

        this.driver_status            =   null;

        this.driving_status           =   null;

        this.ride_status              =   null;

        this.passenger           =   null;

        if(m.driver_status == 0 || m.driver_status == 1)
          this.driver_status = m.driver_status

        this.driving_status = null;
        if(m.driving_status == 1 || m.driving_status == 2 || m.driving_status == 3)
          this.driving_status = m.driving_status

        this.extras = m.extras || {};
        if ((typeof m.extras === 'string' || m.extras instanceof  String) && m.extras != '') {
            this.extras = JSON.parse(m.extras);
        }

        this.passenger = m.passenger || {};
        if ((typeof m.passenger === 'string' || m.passenger instanceof  String) && m.passenger != '') {
            this.passenger = JSON.parse(m.passenger);
        }



        this.setCurrentLat        = (data) => {
          this.current_lat        = data
        };

        this.setCurrentLongt      = (data) => {
          this.current_longt       = data
        };

        this.setDestinationLat    = (data) => {
          this.destination_lat    = data
        };

        this.setDestinationLongt  = (data) => {
          this.destination_longt  = data
        };

        this.setDriverUaNumber  = (data) => {
          this.driver_ua_number = data
        };
        this.setDriverLat       = (data) => {
            this.d_lat          = data
        };
        this.setDriverLongt     = (data) => {
            this.d_longt        = data
        };
        this.setBearing     = (data) => {
            this.bearing        = data
        };
        this.driverStatus       = (data) => {
            this.driver_status  = data
        };
        this.drivingStatus      = (data) => {
            this.driving_status = data
        };

        this.getDriverDetails   = () => {
            return Object.freeze({
                date_created        : this.date_created,
                client_type         : this.client_type,
                d_lat               : this.d_lat,
                d_longt             : this.d_longt,
                p_origin_lat        : this.p_origin_lat,
                p_origin_longt      : this.p_origin_longt,
                p_destination_lat   : this.p_destination_lat,
                p_destination_longt : this.p_destination_longt,
                p_destination_address : this.p_destination_address,
                p_origin_address : this.p_origin_address,
                p_destination_distance : this.p_destination_distance,
                p_destination_eta : this.p_destination_eta,
                driving_status      : this.driving_status,
                driver_status       : this.driver_status,
                current_lat         : this.current_lat,
                current_longt       : this.current_longt,
                destination_lat     : this.destination_lat,
                destination_longt   : this.destination_longt,
                bearing             : this.bearing,
                extras              : this.extras,
                passenger           : this.passenger
            });
        };

    }

}

module.exports = Driver;
