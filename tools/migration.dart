import 'dart:convert';
import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:mytube/database.dart';

class NeDBRecord {
  final String title;
  final String path;
  final DateTime date;
  final String type;
  final int duration;
  final int rate;
  final List<String> tags;
  final List<String> thumbs;

  NeDBRecord.fromJson(Map<String, dynamic> json)
      : title = json['title'],
        path = json['path'],
        date = DateTime.fromMillisecondsSinceEpoch(json['date']['\$\$date']),
        type = json['type'],
        duration = json['duration'],
        rate = json['rate'],
        tags = (json['tags'] as List<dynamic>).cast<String>(),
        thumbs = (json['thumbs'] as List<dynamic>).cast<String>();
}

void main() async {
  final file = File('media.db');

  if (!await file.exists()) {
    print('Error: media.db not found in the project root directory.');
    return;
  }

  final dbFile = File('db.sqlite'); 
  final db = AppDatabase(NativeDatabase(dbFile));
  print('Starting database migration from media.db...');

  final lines = await file.readAsLines();
  final companions = <VideoItemsCompanion>[];

  for (final  line in lines) {
    if (line.trim().isEmpty) continue;

    try {
      final json = jsonDecode(line);
      final record = NeDBRecord.fromJson(json);

      if (record.type != 'video') continue;

      final companion = VideoItemsCompanion.insert(
        title: record.title,
        path: record.path,
        date: record.date,
        duration: record.duration,
        rate: record.rate,
        tags: record.tags,
        thumbs: record.thumbs.map((s) => s.replaceAll('data:image/jpeg;base64,', '')).toList(),
      );
      companions.add(companion);
    } catch (e) {
      print('Failed to parse line: $line');
      print('Error: $e');
    }
  }

  if (companions.isNotEmpty) {
    print('Parsed ${companions.length} records. Inserting into Drift database...');
    await db.batch((batch) {
      batch.insertAll(db.videoItems, companions, mode: InsertMode.replace);
    });
    print('Migration completed.');
  }

  await db.close();
}
