// the module is required for http get request
var request = require("request")
var ayahNum = 0;
var surahNum = 0;
// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

       // if (event.session.application.applicationId !== "") {
       //     context.fail("Invalid Application ID");
       //  }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;
  
    // dispatch custom intents to handlers here
    if (intentName == "GetAyahIntent") {
        ayahNum = intentRequest.intent.slots.ayah.value;
        handleGetAyahIntent(intent, session, callback)
    }else if (intentName == "GetSurahIntent") {
        surahNum = intentRequest.intent.slots.surah.value;
        handleGetSurahIntent(intent, session, callback)
    }else if ("AMAZON.HelpIntent" === intentName) {
        getHelp(callback);
    }else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
	}else {
         throw "Invalid intent"
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
	console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    var speechOutput = "Welcome! to the Quran Translator. You can ask, Alexa, ask Quran Translator Ayah Number 5."

    var reprompt = "You can ask, Alexa, ask Quran Translator Ayah Number 5?"

    var header = "Get Info"

    var shouldEndSession = false

    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

function handleGetAyahIntent(intent, session, callback) {

    var speechOutput = "We have an error"

    getJSON(function(data) {
        if (data != "ERROR") {
            var speechOutput = data
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}

function handleGetSurahIntent(intent, session, callback) {

    var speechOutput = "We have an error"

    getJSONsurah(function(data) {
        if (data != "ERROR") {
            var speechOutput = data
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}

function urlAyah(ayah) {
    var address = "http://api.alquran.cloud/ayah/" + ayah + "/editions/quran-simple,en.asad"
    //return "http://api.alquran.cloud/ayah/5/editions/quran-simple,en.asad"
    return address
}

function urlSurah(surah) {
    var address = "http://api.alquran.cloud/surah/" +surah+ "/en.asad"
    //var address = "http://api.alquran.cloud/surah/114/en.asad"
    return address
}


function getJSON(callback) {

     request.get(urlAyah(ayahNum), function(error, response, body) {
        var d = JSON.parse(body)
        var suraNumber = d.data[0].surah.number
        var ahyaNumber = d.data[0].number
        var meaning = d.data[1].text
        var surahName = d.data[1].surah.englishName
        var result = "Sura Number " + suraNumber + ". Name of the surah: " +surahName + ". Ahya number " + ahyaNumber + "." + " Meaning: " + meaning + "."
             callback(result);
      
     })
}

function getJSONsurah(callback) {

     request.get(urlSurah(surahNum), function(error, response, body) {
        var d = JSON.parse(body)
        var suraNumber = d.data.number
        var suraName = d.data.englishName
        var totalAyah = d.data.numberOfAyahs
        var i
        var meaning = ""
        for(i=0; i<totalAyah; i++) {
            meaning += "Ahya Number " + (i+1) + ". Meaning: " + d.data.ayahs[i].text + ". "
        }

        var result = "Surah number " + suraNumber + ". Name of the surah: " + suraName + ". " + meaning
             callback(result);
      
     })
}


function getHelp(callback) {
    var cardTitle = "Help";
    var speechOutput = "By using the Quran Translator you can learn the English meaning of any surah or ayah. Suppose, to learn first surah of the Quran you can say, Alexa, ask Quran translator surah 1. To learn first ayah say, ayah 1." ;
    var repromptText = "Would you like to learn any surah or ayah?";
    var shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

}


function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using Alexa Quran Translator, Have a nice day!";
    var shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}


// ------- Helper functions to build responses for Alexa -------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
