package com.example.myapplication

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Text
import com.google.firebase.firestore.FirebaseFirestore

@Composable
fun CornerKickScreen(context: Context, matchCode: String) {
    val db = FirebaseFirestore.getInstance()

    LaunchedEffect(Unit) {
        val matchQuery = db.collection("matches").whereEqualTo("matchCode", matchCode)

        matchQuery.get().addOnSuccessListener { querySnapshot ->
            if (!querySnapshot.isEmpty) {
                val docRef = querySnapshot.documents[0].reference

                db.runTransaction { transaction ->
                    val snapshot = transaction.get(docRef)
                    val currentViolations = snapshot.getLong("cornerViolations") ?: 0
                    val updatedViolations = currentViolations + 1
                    transaction.update(docRef, "cornerViolations", updatedViolations)

                    Log.d(
                        "FirebaseTest",
                        "⚠️ Corner Kick Violation added! Total: $updatedViolations for code: $matchCode"
                    )
                }.addOnFailureListener { e ->
                    Log.e("FirebaseTest", "❌ Failed to update corner violation for matchCode: $matchCode", e)
                }
            } else {
                Log.e("FirebaseTest", "❌ No match found with code: $matchCode")
            }
        }.addOnFailureListener {
            Log.e("FirebaseTest", "❌ Error querying match with code: $matchCode", it)
        }

        // Vibrate to alert referee
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(Vibrator::class.java)
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        vibrator.vibrate(
            VibrationEffect.createOneShot(3000, VibrationEffect.DEFAULT_AMPLITUDE)
        )
    }


    // UI
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(200.dp)) {
            drawCircle(
                color = Color.Yellow,
                style = Stroke(width = 6.dp.toPx())
            )
        }
        Text(
            text = "Illegal Corner!",
            fontSize = 25.sp,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 10.dp),
            lineHeight = 20.sp
        )

    }
}
