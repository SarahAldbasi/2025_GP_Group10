package com.example.myapplication

import android.content.Context
import android.util.Log
import org.eclipse.paho.android.service.MqttAndroidClient
import org.eclipse.paho.client.mqttv3.*
import com.google.firebase.firestore.FirebaseFirestore
import org.json.JSONObject

class MqttManager(
    context: Context,
    private val matchCode: String,
    private val onGoalDetected: () -> Unit
) {
    private val clientId = MqttClient.generateClientId()
    private val mqttClient = MqttAndroidClient(context, "tcp://test.mosquitto.org:1883", clientId)

    private val anchor1 = Vec3(0.0, 0.0, 0.0)              // A1: bottom-left
    private val anchor2 = Vec3(1.75, 0.0, 0.0)             // A2: bottom-right
    private val anchor3 = Vec3(0.875, -0.33, 0.0)           // A3: center front
    private val goalThresholdZ = 0.3f
    private val ballRadius = 0.115f

    fun connectAndSubscribe() {
        val options = MqttConnectOptions().apply {
            isCleanSession = true
        }

        mqttClient.connect(options, null, object : IMqttActionListener {
            override fun onSuccess(asyncActionToken: IMqttToken?) {
                Log.d("MQTT", "Connected to broker")
                mqttClient.subscribe("goals/distances", 0, null, object : IMqttActionListener {
                    override fun onSuccess(asyncActionToken: IMqttToken?) {
                        Log.d("MQTT", "Subscribed to topic goals/distances")
                    }

                    override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                        Log.e("MQTT", "Subscription failed", exception)
                    }
                })

                mqttClient.setCallback(object : MqttCallback {
                    override fun messageArrived(topic: String?, message: MqttMessage?) {
                        message?.payload?.let {
                            try {
                                val json = JSONObject(String(it))
                                val d1 = json.optDouble("d1", Double.NaN).takeIf { !it.isNaN() } ?: return
                                val d2 = json.optDouble("d2", Double.NaN).takeIf { !it.isNaN() } ?: return
                                val d3 = json.optDouble("d3", Double.NaN).takeIf { !it.isNaN() } ?: return

                                val position = trilaterate3D(anchor1, d1, anchor2, d2, anchor3, d3) ?: return
                                val (x, y, z) = listOf(position.x, position.y, position.z)
                                Log.d("MQTT", "Ball Position: x=$x, y=$y, z=$z")

                                val ballFrontZ = z - ballRadius
                                if (ballFrontZ <= goalThresholdZ) {
                                    Log.d("MQTT", "⚽ GOAL DETECTED!")
                                    onGoalDetected()
                                }

                                saveSensorDataToFirestore(d1, d2, d3, z.toFloat(), ballFrontZ <= goalThresholdZ)

                            } catch (e: Exception) {
                                Log.e("MQTT", "Failed to parse distances or trilateration failed", e)
                            }
                        }
                    }

                    override fun connectionLost(cause: Throwable?) {
                        Log.e("MQTT", "Connection lost", cause)
                    }

                    override fun deliveryComplete(token: IMqttDeliveryToken?) {}
                })
            }

            override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                Log.e("MQTT", "Connection failed", exception)
            }
        })
    }

    private fun saveSensorDataToFirestore(d1: Double, d2: Double, d3: Double, z: Float, goalDetected: Boolean) {
        val db = FirebaseFirestore.getInstance()
        val timestamp = System.currentTimeMillis()

        val fullData = mapOf(
            "d1" to d1,
            "d2" to d2,
            "d3" to d3,
            "z" to z,
            "goalDetected" to goalDetected,
            "timestamp" to timestamp
        )

        db.collection("matches")
            .document(matchCode)
            .collection("sensor")
            .document("timestamp_$timestamp")
            .set(fullData)
            .addOnSuccessListener {
                Log.d("Firestore", "Sensor data saved successfully!")
            }
            .addOnFailureListener { e ->
                Log.e("Firestore", "Error saving sensor data", e)
            }
    }
}
