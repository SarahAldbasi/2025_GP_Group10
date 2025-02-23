import 'package:flutter/material.dart';

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: SignUpScreen(),
    );
  }
}

class SignUpScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 30.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Image.asset(
                
                'assets/hakkim_logo.png',
                height: 100,
              ),
              SizedBox(height: 20),

              // Title
              Text(
                "Let's get started!",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 20),

              // Profile Image Placeholder
              CircleAvatar(
                radius: 50,
                backgroundColor: Colors.grey[800],
                child: Icon(
                  Icons.image,
                  color: Colors.green,
                  size: 30,
                ),
              ),
              SizedBox(height: 20),

              // Input Fields
              _buildTextField("Name"),
              SizedBox(height: 15),
              _buildTextField("Email"),
              SizedBox(height: 15),
              _buildTextField("Password", isPassword: true),
              SizedBox(height: 15),
              _buildTextField("Confirm Password", isPassword: true),
              SizedBox(height: 20),

              // Sign Up Button
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.black,
                  minimumSize: Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  "SIGN UP",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              SizedBox(height: 20),

              // Login Text
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Already have an account? ",
                    style: TextStyle(color: Colors.white),
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: Text(
                      "Log in",
                      style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // TextField Widget
  Widget _buildTextField(String hint, {bool isPassword = false}) {
    return TextField(
      obscureText: isPassword,
      style: TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey),
        filled: true,
        fillColor: Colors.grey[900],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 15, vertical: 15),
      ),
    );
  }
}