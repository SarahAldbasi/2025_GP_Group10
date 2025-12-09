package com.example.myapplication

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.wear.compose.material.MaterialTheme
import com.google.firebase.firestore.FirebaseFirestore

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)


        val db = FirebaseFirestore.getInstance()


        db.collection("test_collection")
            .add(hashMapOf("message" to "Hello Firebase from Wear OS!"))
            .addOnSuccessListener { Log.d("FirebaseTest", "✅ Firestore write successful!") }
            .addOnFailureListener { e -> Log.e("FirebaseTest", "❌ Firestore write failed!", e) }

        setContent {
            MaterialTheme {
                AppFlow(context = this)
            }
        }
    }
}