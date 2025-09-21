import 'dart:convert';
import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:mytube/database.dart';

class NedbMediaRecord {
  final String title;
  final DateTime date;
  final String type;
  final int duration;
  final int rate;
  final List<String> tags;
  final List<String> thumbs;

  NedbMediaRecord.fromJson(Map<String, dynamic> json)
      : title = json['title'],
        date = DateTime.fromMillisecondsSinceEpoch(json['date']['\$\$date']),
        type = json['type'],
        duration = json['duration'],
        rate = json['rate'],
        tags = (json['tags'] as List<dynamic>).cast<String>(),
        thumbs = (json['thumbs'] as List<dynamic>).cast<String>();
}

class NedbHistoryRecord {
  final String title;
  final DateTime date;

  NedbHistoryRecord.fromJson(Map<String, dynamic> json)
      : title = json['title'],
        date = DateTime.fromMillisecondsSinceEpoch(json['date']['\$\$date']);
}

class NedbTagRecord {
  final String tag;

  NedbTagRecord.fromJson(Map<String, dynamic> json)
      : tag = json['tag'];
}

void main() async {
  final mediaFile = File('media.db');
  final historyFile = File('history.db');
  final tagFile = File('tag.db');

  if (!await mediaFile.exists()) {
    print('Error: media.db not found in the project root directory.');
    return;
  }

  if (!await historyFile.exists()) {
    print('Error: history.db not found in the project root directory.');
    return;
  }

  if (!await tagFile.exists()) {
    print('Error: tag.db not found in the project root directory.');
    return;
  }

  final dbFile = File('db.sqlite'); 
  final db = AppDatabase(NativeDatabase(dbFile));
  print('Starting database migration...');

  final tagFileLines = await tagFile.readAsLines();
  final tagItemsCompanion = <TagItemsCompanion>[];

  for (final line in tagFileLines) {
    if (line.trim().isEmpty) continue;

    try {
      final json = jsonDecode(line);
      final record = NedbTagRecord.fromJson(json);

      final companion = TagItemsCompanion.insert(
        name: record.tag,
      );
      tagItemsCompanion.add(companion);
    } catch (e) {
      print('Failed to parse line: $line');
      print('Error: $e');
    }
  }

  if (tagItemsCompanion.isNotEmpty) {
    print('Parsed ${tagItemsCompanion.length} records. Inserting into Drift database...');
    await db.batch((batch) {
      batch.insertAll(db.tagItems, tagItemsCompanion, mode: InsertMode.replace);
    });
  }

  final mediaFileLines = await mediaFile.readAsLines();
  final mediaItemsCompanion = <MediaItemsCompanion>[];

  for (final line in mediaFileLines) {
    if (line.trim().isEmpty) continue;

    try {
      final json = jsonDecode(line);
      final record = NedbMediaRecord.fromJson(json);
      
      final getIdByName = (name) async {
        final query = db.select(db.tagItems)..where((t) => t.name.equals(name));
        final tag = await query.getSingle();
        return tag.id;
      };
      final futures = record.tags.map((s) => getIdByName(s)).toList();
      final List<int> tagIds = await Future.wait(futures);

      final companion = MediaItemsCompanion.insert(
        title: record.title,
        date: record.date,
        type: record.type,
        duration: record.duration,
        rate: record.rate,
        tags: tagIds,
        thumbs: record.thumbs.map((s) => s.replaceAll('data:image/jpeg;base64,', '')).toList(),
      );
      mediaItemsCompanion.add(companion);
    } catch (e) {
      print('Failed to parse line: $line');
      print('Error: $e');
    }
  }

  if (mediaItemsCompanion.isNotEmpty) {
    print('Parsed ${mediaItemsCompanion.length} records. Inserting into Drift database...');
    await db.batch((batch) {
      batch.insertAll(db.mediaItems, mediaItemsCompanion, mode: InsertMode.replace);
    });
  }

  final historyFileLines = await historyFile.readAsLines();
  final historyItemsCompanion = <HistoryItemsCompanion>[];

  for (final line in historyFileLines) {
    if (line.trim().isEmpty) continue;

    try {
      final json = jsonDecode(line);
      final record = NedbHistoryRecord.fromJson(json);
      
      final getIdByTitle = (title) async {
        final query = db.select(db.mediaItems)..where((t) => t.title.equals(title));
        final tag = await query.getSingle();
        return tag.id;
      };
      final mediaId = await getIdByTitle(record.title);

      final companion = HistoryItemsCompanion.insert(
        media: mediaId,
        date: record.date,
      );
      historyItemsCompanion.add(companion);
    } catch (e) {
      print('Failed to parse line: $line');
      print('Error: $e');
    }
  }

  if (historyItemsCompanion.isNotEmpty) {
    print('Parsed ${historyItemsCompanion.length} records. Inserting into Drift database...');
    await db.batch((batch) {
      batch.insertAll(db.historyItems, historyItemsCompanion, mode: InsertMode.replace);
    });
  }

  print('Migration completed.');
  await db.close();
}
