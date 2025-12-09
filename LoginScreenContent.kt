package com.example.myapplication

import android.util.Log
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.google.firebase.firestore.FirebaseFirestore

@Composable
fun LoginScreenContent(onLoginSuccess: (String) -> Unit) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var infoMessage by remember { mutableStateOf("") }

    val db = FirebaseFirestore.getInstance()

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "Hakkim Referee Access",
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp))

            //  PIN input field (numeric keyboard)
            BasicTextField(
                value = pin,
                onValueChange = { if (it.length <= 5) pin = it },
                textStyle = LocalTextStyle.current.copy(color = Color.White),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                    imeAction = ImeAction.Done
                ),
                visualTransformation = PasswordVisualTransformation(),
                decorationBox = { innerTextField ->
                    Box(
                        modifier = Modifier
                            .border(1.dp, Color.White, RoundedCornerShape(8.dp))
                            .padding(8.dp)
                            .width(140.dp)
                    ) {
                        if (pin.isEmpty())
                            Text("Enter Referee PIN", color = Color.Gray, fontSize = 12.sp)
                        innerTextField()
                    }
                }
            )
            //  PIN length warning
            if (pin.length in 1..4) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Referee PIN must be 5 digits.",
                    color = Color.Yellow,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Normal
                )
            }


            Spacer(modifier = Modifier.height(12.dp))

            //  Verify PIN button
            Button(
                onClick = {

                    //  1. Check length first before Firestore
                    if (pin.length < 5) {
                        error = "Referee PIN must be 5 digits."
                        return@Button
                    }

                    //  2. Only check Firestore when PIN = 5 digits
                    db.collection("users")
                        .whereEqualTo("refereePin", pin)
                        .get()
                        .addOnSuccessListener { snapshot ->
                            val user = snapshot.documents.firstOrNull()
                            if (user != null) {
                                val uid = user.id
                                onLoginSuccess(uid)
                            } else {
                                //  Only shows now because PIN length is valid
                                error = "PIN not found"
                            }
                        }
                        .addOnFailureListener {
                            error = "Login error"
                        }
                },
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF62b204)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .width(90.dp)
                    .height(30.dp)
            ) {
                Text(
                    "Verify PIN",
                    color = Color.Black,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }


            Spacer(modifier = Modifier.height(6.dp))

            //  Inline feedback messages
            if (error.isNotEmpty()) {
                Text(error, color = Color.Red, fontSize = 9.sp)
            } else if (infoMessage.isNotEmpty()) {
                Text(infoMessage, color = Color(0xFF62b204), fontSize = 9.sp)
            }
        }
    }
}
