package com.example.myapplication

import android.content.Context
import android.util.Log
import androidx.compose.runtime.*
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence

@Composable
fun AppFlow(context: Context) {
    var screenState by remember { mutableStateOf(0) } // Start at Welcome
    var matchCode by remember { mutableStateOf("") }
    var refereeUid by remember { mutableStateOf("") }

    // MQTT setup
    val mqttClient = remember {
        MqttClient("tcp://test.mosquitto.org:1883", MqttClient.generateClientId(), MemoryPersistence())
    }
    val coroutineScope = rememberCoroutineScope()

    val db = FirebaseFirestore.getInstance()

    //  MQTT listener
    fun startMqtt() {
        if (!mqttClient.isConnected) {
            try {
                val options = MqttConnectOptions()
                options.isCleanSession = true
                mqttClient.connect(options)
                mqttClient.subscribe("goals/00001") { _, message: MqttMessage ->
                    val payload = message.toString().trim()
                    Log.d("MQTT", " Message received: $payload")

                    when (payload.uppercase()) {
                        "GOAL" -> coroutineScope.launch {
                            screenState = 6
                            delay(5000)
                            screenState = 5
                        }

                        "OUT" -> coroutineScope.launch {
                            screenState = 8
                            delay(5000)
                            screenState = 5
                        }

                        "CORNER" -> coroutineScope.launch {
                            screenState = 9
                            delay(3000)
                            screenState = 5
                        }

                        else -> Log.w("MQTT", " Unknown message: $payload")
                    }
                }
                Log.d("MQTT", " Subscribed to topic goals/00001")
            } catch (e: Exception) {
                Log.e("MQTT", " MQTT connection error", e)
            }
        }
    }

    //  Firestore listener for match end
    LaunchedEffect(screenState) {
        if (screenState == 5) {
            startMqtt()

            db.collection("matches")
                .whereEqualTo("matchCode", matchCode)
                .addSnapshotListener { snapshot, _ ->
                    snapshot?.documents?.firstOrNull()?.getString("status")?.let { status ->
                        if (status == "ended") {
                            Log.d("AppFlow", "Match ended, returning to code entry")

                            try {
                                if (mqttClient.isConnected) {
                                    mqttClient.disconnect()
                                    Log.d("MQTT", "Disconnected after match ended")
                                }
                            } catch (e: Exception) {
                                Log.e("MQTT", "Error disconnecting MQTT", e)
                            }

                            screenState = 7
                        }

                    }
                }
        }
    }

    // ✅ Screens navigation
    when (screenState) {
        0 -> WelcomeScreenContent { screenState = 1 }

        1 -> LoginScreenContent { uid ->
            refereeUid = uid
            screenState = 2
        }

        2 -> MatchCodeScreenContent(
            refereeUid = refereeUid,
            onConnectClick = { code ->
                matchCode = code
                screenState = 3
            }
        )

        3 -> MatchConfirmationScreenContent(
            matchCode = matchCode,
            onConfirmClick = { screenState = 4 },
            onBackClick = { screenState = 2 }
        )

        4 -> {
            LaunchedEffect(Unit) {
                delay(3000)
                screenState = 5
            }
            InitializingScreenContent()
        }

        5 -> WaitingScreenContent()

        6 -> GoalScreen(context = context, matchCode = matchCode)

        7 -> {
            LaunchedEffect(Unit) {
                delay(2000)
                screenState = 0
            }
            MatchEndedScreenContent()
        }

        8 -> OutScreen(context = context, matchCode = matchCode)

        9 -> CornerKickScreen(context = context, matchCode = matchCode)
    }
}
