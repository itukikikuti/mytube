// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $VideoItemsTable extends VideoItems
    with TableInfo<$VideoItemsTable, VideoItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $VideoItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _pathMeta = const VerificationMeta('path');
  @override
  late final GeneratedColumn<String> path = GeneratedColumn<String>(
    'path',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<DateTime> date = GeneratedColumn<DateTime>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _durationMeta = const VerificationMeta(
    'duration',
  );
  @override
  late final GeneratedColumn<int> duration = GeneratedColumn<int>(
    'duration',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _rateMeta = const VerificationMeta('rate');
  @override
  late final GeneratedColumn<int> rate = GeneratedColumn<int>(
    'rate',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  late final GeneratedColumnWithTypeConverter<List<String>, String> tags =
      GeneratedColumn<String>(
        'tags',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      ).withConverter<List<String>>($VideoItemsTable.$convertertags);
  @override
  late final GeneratedColumnWithTypeConverter<List<String>, String> thumbs =
      GeneratedColumn<String>(
        'thumbs',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      ).withConverter<List<String>>($VideoItemsTable.$converterthumbs);
  @override
  List<GeneratedColumn> get $columns => [
    id,
    title,
    path,
    date,
    duration,
    rate,
    tags,
    thumbs,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'video_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<VideoItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('path')) {
      context.handle(
        _pathMeta,
        path.isAcceptableOrUnknown(data['path']!, _pathMeta),
      );
    } else if (isInserting) {
      context.missing(_pathMeta);
    }
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('duration')) {
      context.handle(
        _durationMeta,
        duration.isAcceptableOrUnknown(data['duration']!, _durationMeta),
      );
    } else if (isInserting) {
      context.missing(_durationMeta);
    }
    if (data.containsKey('rate')) {
      context.handle(
        _rateMeta,
        rate.isAcceptableOrUnknown(data['rate']!, _rateMeta),
      );
    } else if (isInserting) {
      context.missing(_rateMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  VideoItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return VideoItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      path: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}path'],
      )!,
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}date'],
      )!,
      duration: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}duration'],
      )!,
      rate: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}rate'],
      )!,
      tags: $VideoItemsTable.$convertertags.fromSql(
        attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}tags'],
        )!,
      ),
      thumbs: $VideoItemsTable.$converterthumbs.fromSql(
        attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}thumbs'],
        )!,
      ),
    );
  }

  @override
  $VideoItemsTable createAlias(String alias) {
    return $VideoItemsTable(attachedDatabase, alias);
  }

  static TypeConverter<List<String>, String> $convertertags =
      const ListConverter();
  static TypeConverter<List<String>, String> $converterthumbs =
      const ListConverter();
}

class VideoItem extends DataClass implements Insertable<VideoItem> {
  final int id;
  final String title;
  final String path;
  final DateTime date;
  final int duration;
  final int rate;
  final List<String> tags;
  final List<String> thumbs;
  const VideoItem({
    required this.id,
    required this.title,
    required this.path,
    required this.date,
    required this.duration,
    required this.rate,
    required this.tags,
    required this.thumbs,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['title'] = Variable<String>(title);
    map['path'] = Variable<String>(path);
    map['date'] = Variable<DateTime>(date);
    map['duration'] = Variable<int>(duration);
    map['rate'] = Variable<int>(rate);
    {
      map['tags'] = Variable<String>(
        $VideoItemsTable.$convertertags.toSql(tags),
      );
    }
    {
      map['thumbs'] = Variable<String>(
        $VideoItemsTable.$converterthumbs.toSql(thumbs),
      );
    }
    return map;
  }

  VideoItemsCompanion toCompanion(bool nullToAbsent) {
    return VideoItemsCompanion(
      id: Value(id),
      title: Value(title),
      path: Value(path),
      date: Value(date),
      duration: Value(duration),
      rate: Value(rate),
      tags: Value(tags),
      thumbs: Value(thumbs),
    );
  }

  factory VideoItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return VideoItem(
      id: serializer.fromJson<int>(json['id']),
      title: serializer.fromJson<String>(json['title']),
      path: serializer.fromJson<String>(json['path']),
      date: serializer.fromJson<DateTime>(json['date']),
      duration: serializer.fromJson<int>(json['duration']),
      rate: serializer.fromJson<int>(json['rate']),
      tags: serializer.fromJson<List<String>>(json['tags']),
      thumbs: serializer.fromJson<List<String>>(json['thumbs']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'title': serializer.toJson<String>(title),
      'path': serializer.toJson<String>(path),
      'date': serializer.toJson<DateTime>(date),
      'duration': serializer.toJson<int>(duration),
      'rate': serializer.toJson<int>(rate),
      'tags': serializer.toJson<List<String>>(tags),
      'thumbs': serializer.toJson<List<String>>(thumbs),
    };
  }

  VideoItem copyWith({
    int? id,
    String? title,
    String? path,
    DateTime? date,
    int? duration,
    int? rate,
    List<String>? tags,
    List<String>? thumbs,
  }) => VideoItem(
    id: id ?? this.id,
    title: title ?? this.title,
    path: path ?? this.path,
    date: date ?? this.date,
    duration: duration ?? this.duration,
    rate: rate ?? this.rate,
    tags: tags ?? this.tags,
    thumbs: thumbs ?? this.thumbs,
  );
  VideoItem copyWithCompanion(VideoItemsCompanion data) {
    return VideoItem(
      id: data.id.present ? data.id.value : this.id,
      title: data.title.present ? data.title.value : this.title,
      path: data.path.present ? data.path.value : this.path,
      date: data.date.present ? data.date.value : this.date,
      duration: data.duration.present ? data.duration.value : this.duration,
      rate: data.rate.present ? data.rate.value : this.rate,
      tags: data.tags.present ? data.tags.value : this.tags,
      thumbs: data.thumbs.present ? data.thumbs.value : this.thumbs,
    );
  }

  @override
  String toString() {
    return (StringBuffer('VideoItem(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('path: $path, ')
          ..write('date: $date, ')
          ..write('duration: $duration, ')
          ..write('rate: $rate, ')
          ..write('tags: $tags, ')
          ..write('thumbs: $thumbs')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, title, path, date, duration, rate, tags, thumbs);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is VideoItem &&
          other.id == this.id &&
          other.title == this.title &&
          other.path == this.path &&
          other.date == this.date &&
          other.duration == this.duration &&
          other.rate == this.rate &&
          other.tags == this.tags &&
          other.thumbs == this.thumbs);
}

class VideoItemsCompanion extends UpdateCompanion<VideoItem> {
  final Value<int> id;
  final Value<String> title;
  final Value<String> path;
  final Value<DateTime> date;
  final Value<int> duration;
  final Value<int> rate;
  final Value<List<String>> tags;
  final Value<List<String>> thumbs;
  const VideoItemsCompanion({
    this.id = const Value.absent(),
    this.title = const Value.absent(),
    this.path = const Value.absent(),
    this.date = const Value.absent(),
    this.duration = const Value.absent(),
    this.rate = const Value.absent(),
    this.tags = const Value.absent(),
    this.thumbs = const Value.absent(),
  });
  VideoItemsCompanion.insert({
    this.id = const Value.absent(),
    required String title,
    required String path,
    required DateTime date,
    required int duration,
    required int rate,
    required List<String> tags,
    required List<String> thumbs,
  }) : title = Value(title),
       path = Value(path),
       date = Value(date),
       duration = Value(duration),
       rate = Value(rate),
       tags = Value(tags),
       thumbs = Value(thumbs);
  static Insertable<VideoItem> custom({
    Expression<int>? id,
    Expression<String>? title,
    Expression<String>? path,
    Expression<DateTime>? date,
    Expression<int>? duration,
    Expression<int>? rate,
    Expression<String>? tags,
    Expression<String>? thumbs,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (title != null) 'title': title,
      if (path != null) 'path': path,
      if (date != null) 'date': date,
      if (duration != null) 'duration': duration,
      if (rate != null) 'rate': rate,
      if (tags != null) 'tags': tags,
      if (thumbs != null) 'thumbs': thumbs,
    });
  }

  VideoItemsCompanion copyWith({
    Value<int>? id,
    Value<String>? title,
    Value<String>? path,
    Value<DateTime>? date,
    Value<int>? duration,
    Value<int>? rate,
    Value<List<String>>? tags,
    Value<List<String>>? thumbs,
  }) {
    return VideoItemsCompanion(
      id: id ?? this.id,
      title: title ?? this.title,
      path: path ?? this.path,
      date: date ?? this.date,
      duration: duration ?? this.duration,
      rate: rate ?? this.rate,
      tags: tags ?? this.tags,
      thumbs: thumbs ?? this.thumbs,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (path.present) {
      map['path'] = Variable<String>(path.value);
    }
    if (date.present) {
      map['date'] = Variable<DateTime>(date.value);
    }
    if (duration.present) {
      map['duration'] = Variable<int>(duration.value);
    }
    if (rate.present) {
      map['rate'] = Variable<int>(rate.value);
    }
    if (tags.present) {
      map['tags'] = Variable<String>(
        $VideoItemsTable.$convertertags.toSql(tags.value),
      );
    }
    if (thumbs.present) {
      map['thumbs'] = Variable<String>(
        $VideoItemsTable.$converterthumbs.toSql(thumbs.value),
      );
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('VideoItemsCompanion(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('path: $path, ')
          ..write('date: $date, ')
          ..write('duration: $duration, ')
          ..write('rate: $rate, ')
          ..write('tags: $tags, ')
          ..write('thumbs: $thumbs')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $VideoItemsTable videoItems = $VideoItemsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [videoItems];
}

typedef $$VideoItemsTableCreateCompanionBuilder =
    VideoItemsCompanion Function({
      Value<int> id,
      required String title,
      required String path,
      required DateTime date,
      required int duration,
      required int rate,
      required List<String> tags,
      required List<String> thumbs,
    });
typedef $$VideoItemsTableUpdateCompanionBuilder =
    VideoItemsCompanion Function({
      Value<int> id,
      Value<String> title,
      Value<String> path,
      Value<DateTime> date,
      Value<int> duration,
      Value<int> rate,
      Value<List<String>> tags,
      Value<List<String>> thumbs,
    });

class $$VideoItemsTableFilterComposer
    extends Composer<_$AppDatabase, $VideoItemsTable> {
  $$VideoItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get path => $composableBuilder(
    column: $table.path,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get duration => $composableBuilder(
    column: $table.duration,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get rate => $composableBuilder(
    column: $table.rate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnWithTypeConverterFilters<List<String>, List<String>, String> get tags =>
      $composableBuilder(
        column: $table.tags,
        builder: (column) => ColumnWithTypeConverterFilters(column),
      );

  ColumnWithTypeConverterFilters<List<String>, List<String>, String>
  get thumbs => $composableBuilder(
    column: $table.thumbs,
    builder: (column) => ColumnWithTypeConverterFilters(column),
  );
}

class $$VideoItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $VideoItemsTable> {
  $$VideoItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get path => $composableBuilder(
    column: $table.path,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get duration => $composableBuilder(
    column: $table.duration,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get rate => $composableBuilder(
    column: $table.rate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tags => $composableBuilder(
    column: $table.tags,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get thumbs => $composableBuilder(
    column: $table.thumbs,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$VideoItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $VideoItemsTable> {
  $$VideoItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get path =>
      $composableBuilder(column: $table.path, builder: (column) => column);

  GeneratedColumn<DateTime> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<int> get duration =>
      $composableBuilder(column: $table.duration, builder: (column) => column);

  GeneratedColumn<int> get rate =>
      $composableBuilder(column: $table.rate, builder: (column) => column);

  GeneratedColumnWithTypeConverter<List<String>, String> get tags =>
      $composableBuilder(column: $table.tags, builder: (column) => column);

  GeneratedColumnWithTypeConverter<List<String>, String> get thumbs =>
      $composableBuilder(column: $table.thumbs, builder: (column) => column);
}

class $$VideoItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $VideoItemsTable,
          VideoItem,
          $$VideoItemsTableFilterComposer,
          $$VideoItemsTableOrderingComposer,
          $$VideoItemsTableAnnotationComposer,
          $$VideoItemsTableCreateCompanionBuilder,
          $$VideoItemsTableUpdateCompanionBuilder,
          (
            VideoItem,
            BaseReferences<_$AppDatabase, $VideoItemsTable, VideoItem>,
          ),
          VideoItem,
          PrefetchHooks Function()
        > {
  $$VideoItemsTableTableManager(_$AppDatabase db, $VideoItemsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$VideoItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$VideoItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$VideoItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String> path = const Value.absent(),
                Value<DateTime> date = const Value.absent(),
                Value<int> duration = const Value.absent(),
                Value<int> rate = const Value.absent(),
                Value<List<String>> tags = const Value.absent(),
                Value<List<String>> thumbs = const Value.absent(),
              }) => VideoItemsCompanion(
                id: id,
                title: title,
                path: path,
                date: date,
                duration: duration,
                rate: rate,
                tags: tags,
                thumbs: thumbs,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String title,
                required String path,
                required DateTime date,
                required int duration,
                required int rate,
                required List<String> tags,
                required List<String> thumbs,
              }) => VideoItemsCompanion.insert(
                id: id,
                title: title,
                path: path,
                date: date,
                duration: duration,
                rate: rate,
                tags: tags,
                thumbs: thumbs,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$VideoItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $VideoItemsTable,
      VideoItem,
      $$VideoItemsTableFilterComposer,
      $$VideoItemsTableOrderingComposer,
      $$VideoItemsTableAnnotationComposer,
      $$VideoItemsTableCreateCompanionBuilder,
      $$VideoItemsTableUpdateCompanionBuilder,
      (VideoItem, BaseReferences<_$AppDatabase, $VideoItemsTable, VideoItem>),
      VideoItem,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$VideoItemsTableTableManager get videoItems =>
      $$VideoItemsTableTableManager(_db, _db.videoItems);
}
