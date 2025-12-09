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
fun GoalScreen(context: Context, matchCode: String) {
    val db = FirebaseFirestore.getInstance()

    LaunchedEffect(Unit) {
        val matchQuery = db.collection("matches").whereEqualTo("matchCode", matchCode)

        matchQuery.get().addOnSuccessListener { querySnapshot ->
            if (!querySnapshot.isEmpty) {
                val docRef = querySnapshot.documents[0].reference

                db.runTransaction { transaction ->
                    val snapshot = transaction.get(docRef)
                    val currentGoals = snapshot.getLong("matchGoals") ?: 0
                    val updatedGoals = currentGoals + 1
                    transaction.update(docRef, "matchGoals", updatedGoals)

                    Log.d("FirebaseTest", "✅ Goal added! Total: $updatedGoals for code: $matchCode")
                }.addOnFailureListener { e ->
                    Log.e("FirebaseTest", "❌ Failed to update goal for matchCode: $matchCode", e)
                }
            } else {
                Log.e("FirebaseTest", "❌ No match found with code: $matchCode")
            }
        }.addOnFailureListener {
            Log.e("FirebaseTest", "❌ Error querying match with code: $matchCode", it)
        }

        // Vibrate
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
                color = Color.Green,
                style = Stroke(width = 6.dp.toPx())
            )
        }
        Text(
            text = "GOAL!",
            fontSize = 36.sp,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
    }
}
