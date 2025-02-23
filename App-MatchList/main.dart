import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: MatchesScreen(),
    );
  }
}

class MatchesScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(
          'All Matches',
          style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () {
            // Handle back button press
          },
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
        child: ListView(
          children: [
            MatchCard(
              team1: 'Al Hilal',
              team2: 'Al Nassr',
              date: 'Fri, Feb 28',
              time: '20:00',
              logo1: 'assets/alhilal.png',
              logo2: 'assets/alnassr.png',
            ),
            SizedBox(height: 16),
            MatchCard(
              team1: 'Al Hilal',
              team2: 'Al Ahli',
              date: 'Thu, Mar 13',
              time: '18:00',
              logo1: 'assets/alhilal.png',
              logo2: 'assets/alahli.png',
            ),
            SizedBox(height: 16),
            MatchCard(
              team1: 'Al Ahli',
              team2: 'Al Nassr',
              date: 'Thu, Mar 13',
              time: '18:00',
              logo1: 'assets/alahli.png',
              logo2: 'assets/alnassr.png',
            ),
          ],
        ),
      ),
    );
  }
}

class MatchCard extends StatelessWidget {
  final String team1;
  final String team2;
  final String date;
  final String time;
  final String logo1;
  final String logo2;

  MatchCard({
    required this.team1,
    required this.team2,
    required this.date,
    required this.time,
    required this.logo1,
    required this.logo2,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Color(0xFF222222), // Dark background for the card
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Image.asset(logo1, width: 40, height: 40),
                    SizedBox(width: 10),
                    Text(
                      team1,
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.grey[800], // Dark gray background
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'VS',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                Row(
                  children: [
                    Text(
                      team2,
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(width: 10),
                    Image.asset(logo2, width: 40, height: 40),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Color(0xFF1A1A1A), // Slightly lighter background for date section
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$date  $time',
                  style: TextStyle(color: Colors.white70, fontSize: 16),
                ),
                Container(
                  decoration: BoxDecoration(
                    color: Color(0xFF6AB100), // Green button
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Text(
                    'View details',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
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
