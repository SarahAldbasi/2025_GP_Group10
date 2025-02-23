import 'package:flutter/material.dart';

void main() {
  runApp(HakkimApp());
}

class HakkimApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WelcomeScreen(),
    );
  }
}

class WelcomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(171717), // Updated background color
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(height: 40),
          Center(
            child: Image.asset(
              'assets/hakkim_logo.png', // Ensure this image is in your assets folder
              width: 280, // Adjusted size
            ),
          ),
          SizedBox(height: 40),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Align(
              alignment: Alignment.centerLeft, // Aligned to the left
              child: Text(
                "Hello!",
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "Welcome to Hakkim! A platform that simplifies match management and officiating all in one place.",
                style: TextStyle(
                  fontSize: 14, // Made smaller
                  color: Colors.white70,
                ),
              ),
            ),
          ),
          SizedBox(height: 60),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    border: Border.all(color: Color(0xFF6AB100)), // Updated green color
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: TextButton(
                    onPressed: () {},
                    child: Text(
                      "LOG IN",
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                ),
                SizedBox(height: 20),
                Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Color(0xFF6AB100), // Updated green color
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: TextButton(
                    onPressed: () {},
                    child: Text(
                      "SIGN UP",
                      style: TextStyle(color: Colors.black, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
