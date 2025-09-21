import 'dart:convert';
// import 'dart:io';
import 'package:drift/drift.dart';
// import 'package:drift/native.dart';
// import 'package:path_provider/path_provider.dart';
// import 'package:path/path.dart' as p;

part 'database.g.dart';

@DataClassName('MediaItem')
class MediaItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get title => text()();
  DateTimeColumn get date => dateTime()();
  TextColumn get type => text()();
  IntColumn get duration => integer()();
  IntColumn get rate => integer()();
  TextColumn get tags => text().map(const IntListConverter())();
  TextColumn get thumbs => text().map(const StringListConverter())();
}

@DataClassName('HistoryItem')
class HistoryItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get media => integer()();
  DateTimeColumn get date => dateTime()();
}

@DataClassName('TagItem')
class TagItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
}

class StringListConverter extends TypeConverter<List<String>, String> {
  const StringListConverter();
  @override
  List<String> fromSql(String fromDb) {
    return (json.decode(fromDb) as List<dynamic>).cast<String>();
  }

  @override
  String toSql(List<String> value) {
    return json.encode(value);
  }
}

class IntListConverter extends TypeConverter<List<int>, String> {
  const IntListConverter();
  @override
  List<int> fromSql(String fromDb) {
    return (json.decode(fromDb) as List<dynamic>).cast<int>();
  }

  @override
  String toSql(List<int> value) {
    return json.encode(value);
  }
}

@DriftDatabase(tables: [MediaItems, HistoryItems, TagItems])
class AppDatabase extends _$AppDatabase {
  AppDatabase(QueryExecutor e) : super(e);
  // AppDatabase.connect() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

// LazyDatabase _openConnection() {
//   return LazyDatabase(() async {
//     final dbFolder = await getApplicationDocumentsDirectory();
//     final file = File(p.join(dbFolder.path, 'db.sqlite'));
//     return NativeDatabase.createInBackground(file);
//   });
// }
