package com.example.myapplication


import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.Text
import coil.compose.rememberAsyncImagePainter
import com.google.firebase.firestore.FirebaseFirestore
import java.text.SimpleDateFormat
import java.util.*


@Composable
fun MatchConfirmationScreenContent(
    matchCode: String,
    onConfirmClick: () -> Unit,
    onBackClick: () -> Unit
) {
    val db = FirebaseFirestore.getInstance()

    var homeTeamName by remember { mutableStateOf("Home Team") }
    var homeTeamLogo by remember { mutableStateOf("") }
    var awayTeamName by remember { mutableStateOf("Away Team") }
    var awayTeamLogo by remember { mutableStateOf("") }
    var matchDate by remember { mutableStateOf("Loading...") }

    LaunchedEffect(matchCode) {
        db.collection("matches")
            .whereEqualTo("matchCode", matchCode)
            .get()
            .addOnSuccessListener { result ->
                val document = result.documents.firstOrNull()
                if (document != null) {
                    homeTeamName = document.getString("homeTeam.name") ?: "Unknown"
                    homeTeamLogo = document.getString("homeTeam.logo") ?: ""
                    awayTeamName = document.getString("awayTeam.name") ?: "Unknown"
                    awayTeamLogo = document.getString("awayTeam.logo") ?: ""

                    val timestamp = document.getTimestamp("date")
                    matchDate = timestamp?.toDate()?.let {
                        val sdf = SimpleDateFormat("dd MMM yyyy HH:mm", Locale.getDefault())
                        sdf.format(it)
                    } ?: "No Date"
                    Log.d("FirebaseTest", " Match loaded for code $matchCode")
                } else {
                    matchDate = "Match not found"
                    Log.e("FirebaseTest", " Match code not found: $matchCode")
                }
            }
            .addOnFailureListener {
                matchDate = "Error Loading"
                Log.e("FirebaseTest", " Error fetching data", it)
            }
    }


    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(2.dp)
    ) {

        Icon(
            imageVector = Icons.Default.ArrowBack,
            contentDescription = "Back",
            tint = Color.White, // Black arrow for contrast
            modifier = Modifier
                .offset(x = 30.dp, y = 20.dp)


                .size(30.dp)
                .align(Alignment.TopStart)
                .background(Color.Black, shape = RoundedCornerShape(50)) // White background
                .padding(5.dp)
                .clickable { onBackClick() }
        )



        // Main content...
// Main content...
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(top = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (homeTeamLogo.isNotEmpty()) {
                    Image(
                        painter = rememberAsyncImagePainter(homeTeamLogo),
                        contentDescription = homeTeamName,
                        modifier = Modifier.size(30.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                Text(
                    text = "VS",
                    fontSize = 10.sp,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .background(Color.DarkGray, shape = RoundedCornerShape(6.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                if (awayTeamLogo.isNotEmpty()) {
                    Image(
                        painter = rememberAsyncImagePainter(awayTeamLogo),
                        contentDescription = awayTeamName,
                        modifier = Modifier.size(30.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp)) // space between logos and date

            Text(
                text = matchDate,
                fontSize = 10.sp,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp)) // space between date and button

            Button(
                onClick = onConfirmClick,
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF62b204)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .width(90.dp)
                    .height(30.dp)
            ) {
                Text("Confirm", color = Color.Black, fontSize = 12.sp,fontWeight = FontWeight.Medium )

            }
        }

    }
}
