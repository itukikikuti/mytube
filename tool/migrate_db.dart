
import 'dart:convert';
import 'dart:io';

import 'package:mytube/database.dart';
import 'package:drift/drift.dart';

void main() async {
  final db = AppDatabase();
  final file = File('media.db');

  if (!await file.exists()) {
    print('Error: media.db not found in the project root directory.');
    return;
  }

  print('Starting database migration from media.db...');

  var successCount = 0;
  var errorCount = 0;

  final lines = file.openRead().transform(utf8.decoder).transform(const LineSplitter());

  await for (var line in lines) {
    if (line.isEmpty) continue;

    try {
      final json = jsonDecode(line) as Map<String, dynamic>;

      final path = json['path'] as String?;
      if (path == null) {
        print('Skipping line (missing path): $line');
        errorCount++;
        continue;
      }
      
      // NeDB uses _id, but our schema has an auto-incrementing id, so we ignore it.
      final creationTimeMillis = json['creationTime'] as int?;
      final creationTime = creationTimeMillis != null
          ? DateTime.fromMillisecondsSinceEpoch(creationTimeMillis)
          : DateTime.now(); // Or handle as an error if creationTime is mandatory

      final title = json['title'] as String?;
      final duration = json['duration'] as int?;
      final rate = json['rate'] as int?;
      final tags = (json['tags'] as List?)?.cast<String>();

      final mediaItem = MediaItemsCompanion(
        path: Value(path),
        creationTime: Value(creationTime),
        title: Value(title),
        duration: Value(duration),
        rate: Value(rate),
        tags: Value(tags),
      );

      await db.into(db.mediaItems).insert(mediaItem, mode: InsertMode.insertOrIgnore);
      successCount++;
    } catch (e) {
      print('Failed to process line: $line');
      print('Error: $e');
      errorCount++;
    }
  }

  print('Migration finished.');
  print('Successfully processed: $successCount items.');
  print('Failed to process: $errorCount items.');
}
