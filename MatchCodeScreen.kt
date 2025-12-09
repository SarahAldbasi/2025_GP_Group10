package com.example.myapplication

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.google.firebase.firestore.FirebaseFirestore
import android.util.Log
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction

@Composable
fun MatchCodeScreenContent(
    refereeUid: String,
    onConnectClick: (String) -> Unit
) {
    var matchCode by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }
    val db = FirebaseFirestore.getInstance()

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Enter Match Code",
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp))

            BasicTextField(
                value = matchCode,
                onValueChange = {
                    if (it.length <= 5) matchCode = it
                },
                textStyle = androidx.compose.ui.text.TextStyle(
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                    imeAction = ImeAction.Done
                ),
                modifier = Modifier
                    .width(120.dp)
                    .height(35.dp)
                    .border(2.dp, Color.White, RoundedCornerShape(10.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )

            if (matchCode.length in 1..4) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Match code must be 5 digits.",
                    color = Color.Yellow,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Normal
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (matchCode.isBlank()) {
                        errorMessage = "Please enter a match code"
                        return@Button
                    }

                    db.collection("matches")
                        .whereEqualTo("matchCode", matchCode)
                        .get()
                        .addOnSuccessListener { result ->
                            val doc = result.documents.firstOrNull()
                            if (doc != null) {
                                val status = doc.getString("status")
                                val main = doc.get("mainReferee") as? Map<*, *>
                                val a1 = doc.get("assistantReferee1") as? Map<*, *>
                                val a2 = doc.get("assistantReferee2") as? Map<*, *>
                                Log.d("MatchCodeScreen", "Referee UID = $refereeUid")
                                Log.d("MatchCodeScreen", "MainReferee ID = ${main?.get("id")}")
                                Log.d("MatchCodeScreen", "Assistant1 ID = ${a1?.get("id")}")
                                Log.d("MatchCodeScreen", "Assistant2 ID = ${a2?.get("id")}")


                                val authorized = listOf(main, a1, a2).any {
                                    it?.get("id") == refereeUid
                                }

                                if (!authorized) {
                                    errorMessage = "You are not assigned to this match."
                                } else if (status == "live" || status == "not_started"|| status == "started") {
                                    onConnectClick(matchCode)
                                } else {
                                    errorMessage = "This match is not available."
                                }

                            } else {
                                errorMessage = "Invalid code. Try again."
                            }
                        }
                        .addOnFailureListener { e ->
                            errorMessage = "Error checking code"
                            Log.e("MatchCodeScreen", "Firestore error: ", e)
                        }
                },
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF62b204)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .width(90.dp)
                    .height(30.dp)
            ) {
                Text(
                    text = "Connect",
                    color = Color.Black,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            if (matchCode.length == 5 && errorMessage.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = errorMessage,
                    color = Color.Red,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
@Composable
fun MatchEndedScreenContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Match has ended",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}
