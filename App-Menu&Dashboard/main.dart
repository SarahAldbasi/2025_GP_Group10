import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.all(8.0),
          child: CircleAvatar(
            backgroundImage: AssetImage("assets/profile.jpg"),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("HELLO", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w400)),
            Text("Mohammed", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.notifications, color: Colors.white),
            onPressed: () {},
          ),
          Builder(
            builder: (context) => IconButton(
              icon: Icon(Icons.menu, color: Colors.white),
              onPressed: () {
                Scaffold.of(context).openDrawer();
              },
            ),
          ),
        ],
      ),
      drawer: _buildDrawer(context),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _UpcomingMatchCard(),
            SizedBox(height: 20),
            Text("All Matches", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 10),
            Expanded(
              child: ListView(
                children: [
                  MatchCard(team1: "Al Ahli", team2: "Al Nassr", logo1: "assets/alahli.png", logo2: "assets/alnassr.png"),
                  SizedBox(height: 10),
                  MatchCard(team1: "Al Hilal", team2: "Al Ahli", logo1: "assets/alhilal.png", logo2: "assets/alahli.png"),
                  SizedBox(height: 10),
                  MatchCard(team1: "Al Hilal", team2: "Al Ahli", logo1: "assets/alhilal.png", logo2: "assets/alahli.png"),
                ],
              ),
            ),
            Center(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey[800],
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () {},
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  child: Text("See All", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _buildDrawer(BuildContext context) {
  return Drawer(
    child: Container(
      color: Colors.black,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: Colors.grey[900]),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundImage: AssetImage("assets/profile.jpg"),
                ),
                SizedBox(width: 10),
                Text(
                  "Mohammed\nAl Hoish",
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          _buildDrawerItem(Icons.person, "Profile", () {}),
          _buildDrawerItem(Icons.sports_soccer, "Matches", () {}),
          _buildDrawerItem(Icons.settings, "Settings", () {}),
        ],
      ),
    ),
  );
}

Widget _buildDrawerItem(IconData icon, String title, VoidCallback onTap) {
  return ListTile(
    leading: Icon(icon, color: Colors.white),
    title: Text(title, style: TextStyle(color: Colors.white, fontSize: 18)),
    onTap: onTap,
  );
}

class _UpcomingMatchCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.green,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text("Upcoming match", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
          SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                children: [
                  Image.asset("assets/alhilal.png", width: 60, height: 60),
                  SizedBox(height: 8),
                  Text(
                    "Al Hilal",
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey[800],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text("VS", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              Column(
                children: [
                  Image.asset("assets/alnassr.png", width: 60, height: 60),
                  SizedBox(height: 8),
                  Text(
                    "Al Nassr",
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 10),
          Text("28 FEB 2025\n5:30 PM", textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 16)),
          SizedBox(height: 10),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey[800],
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              padding: EdgeInsets.symmetric(horizontal: 90, vertical: 2),
            ),
            onPressed: () {},
            child: Text("Match Details", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class MatchCard extends StatelessWidget {
  final String team1;
  final String team2;
  final String logo1;
  final String logo2;

  MatchCard({required this.team1, required this.team2, required this.logo1, required this.logo2});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            children: [
              Image.asset(logo1, width: 40, height: 40),
              SizedBox(height: 5),
              Text(team1, style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            ],
          ),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.grey[800],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text("VS", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          Column(
            children: [
              Image.asset(logo2, width: 40, height: 40),
              SizedBox(height: 5),
              Text(team2, style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
