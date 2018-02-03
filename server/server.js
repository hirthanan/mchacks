// Stores Organizations schedule data in firebase database
var firebase = require('firebase');

'use strict';

// set data here, could use environmental variables to simplify this step -- begin
const BOTTOKEN = "..."; // set the bots auth token to constant
const SERVER = "..."; // the url to your webhook receiving server
// set data here, could use environmental variables to simplify this step -- end

const EXPRESS = require( 'express' ); // used as the webserver
const BODYPARSER = require( 'body-parser' ); // interprets body read by express
const SPARK = require( 'ciscospark' ); // the nodejs cisco spark sdk

// initialize application -- begin
let webApp = EXPRESS( ); // construct the web webserver
webApp.use( BODYPARSER.json( ) ); // instruct the web app to read json through the helper library, "body-parser"
let sparkBot = new SPARK.init( { "credentials":{ "access_token":BOTTOKEN } } ); // initilize a new botToken
let sparkBotID = ""; // stores the id of the spark bot
let sparkBotWH = ""; // stores the id of the webhook the bot uses
// initialize application -- end

sparkBot.once( 'ready', ( ) => { // handle on bot ready
  initBot( ).then( ( r ) => { // perform initialization of the bot via cisco spark
    console.log( 'app ready' ); // print if the bot is fully ready;
    main( );
  } ).catch( ( e ) => {
    throw e; // throw an error if it doesn't succeed
  } );
} );

function initBot ( )
{ return new Promise( ( resolve, reject ) => {
  sparkBot.webhooks.create( { // create a webhook that targets your server
    "resource":"messages",
    "event":"created",
    "name":`mchack`,
    "targetUrl":`${SERVER}/spark`// sets the target to the /webhook endpoint on your server
  } ).then( ( r ) => {
    sparkBotWH = r.id;
    sparkBot.people.get( 'me' ).then( ( r ) => {
      console.log( 'test', r );
      sparkBotID = r.id;
      main( );
      resolve( r ); // resolves
    } ).catch( ( e ) => {
      reject( e ); // rejects on failed information received
    } );
  } ).catch( ( e ) => {
    reject( e ); // rejects on failed webhook creation
  } );
} ); }

function stopBot ( )
{ return new Promise ( ( resolve, reject ) => {
  sparkBot.webhooks.remove( sparkBotWH ).then( ( r ) => { resolve( ); } ).catch( ( e ) => { throw e; } );
} ); }

function main ( )
{
  webApp.post( '/spark', ( request, response ) => { // when a bot receives a message, do this

    console.log( request.body );

    if ( request.body.data.personId == sparkBotID )
    { return; } // return if it's a bot's message, to prevent an infinte loop

    // We will echo the message sent back for this demo:

    sparkBot.messages.get( request.body.data.id ).then( ( r ) => { // get the message details to echo back
      sparkBot.messages.create( { // send the message back
        "markdown":r.text,
        "roomId":r.roomId
      } ).then( ( r ) => {
        response.sendStatus( 200 ); // respond with 200 to api.ciscospark.com
      } ).catch( ( e ) => {
        response.sendStatus( 503 ); // if the message fails to send, respond with 503
        throw e;
      } );
    } ).catch( ( e ) => {
      response.sendStatus( 503 ); // if getting message details fails, respond with 503
      throw e;
    } );


  } );
}

// exit handler -- begin
// this prevents webhooks from infinitely staying on api.ciscospark.com for your bot

function exitHandler(options, err) {
  stopBot( ).then( ( r ) => {
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
  } );
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// exit handler -- end


webApp.listen( 8080 );