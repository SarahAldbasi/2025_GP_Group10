package com.example.myapplication

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Text

@Composable
fun WelcomeScreenContent(onStartClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable { onStartClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // ✅ Logo Image
            Image(
                painter = painterResource(id = R.drawable.hakkim_logo),
                contentDescription = "Hakkim Logo",
                modifier = Modifier.size(100.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // ✅ Welcome Text
            Text(
                text = "Welcome to Hakkim",
                fontSize = 14.sp,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))


            Text(
                text = "Tap to Start",
                fontSize = 10.sp,
                color = Color.White,
                fontWeight = FontWeight.Normal
            )
        }
    }
}
