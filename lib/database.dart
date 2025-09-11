import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'database.g.dart';

// Define the table
class MediaItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get path => text().unique()();
  DateTimeColumn get creationTime => dateTime()();
  TextColumn get title => text().nullable()();
  IntColumn get duration => integer().nullable()();
  IntColumn get rate => integer().nullable()();
  TextColumn get tags => text().map(const ListOfStringsConverter()).nullable()();
}

class ListOfStringsConverter extends TypeConverter<List<String>, String> {
  const ListOfStringsConverter();
  @override
  List<String> fromSql(String fromDb) {
    try {
      final decoded = json.decode(fromDb);
      if (decoded is List) {
        return decoded.cast<String>();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  @override
  String toSql(List<String> value) {
    return json.encode(value);
  }
}

@DriftDatabase(tables: [MediaItems])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2; // Bump the schema version

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        if (from < 2) {
          // we added the title, duration, rate and tags columns in version 2
          await m.addColumn(mediaItems, mediaItems.title);
          await m.addColumn(mediaItems, mediaItems.duration);
          await m.addColumn(mediaItems, mediaItems.rate);
          await m.addColumn(mediaItems, mediaItems.tags);
        }
      },
    );
  }
}

LazyDatabase _openConnection() {
  // the LazyDatabase util lets us find the right location for the file async.
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'db.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
