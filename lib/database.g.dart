// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $MediaItemsTable extends MediaItems
    with TableInfo<$MediaItemsTable, MediaItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MediaItemsTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<DateTime> date = GeneratedColumn<DateTime>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
    'type',
    aliasedName,
    false,
    type: DriftSqlType.string,
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
  late final GeneratedColumnWithTypeConverter<List<int>, String> tags =
      GeneratedColumn<String>(
        'tags',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      ).withConverter<List<int>>($MediaItemsTable.$convertertags);
  @override
  late final GeneratedColumnWithTypeConverter<List<String>, String> thumbs =
      GeneratedColumn<String>(
        'thumbs',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      ).withConverter<List<String>>($MediaItemsTable.$converterthumbs);
  @override
  List<GeneratedColumn> get $columns => [
    id,
    title,
    date,
    type,
    duration,
    rate,
    tags,
    thumbs,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'media_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<MediaItem> instance, {
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
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
        _typeMeta,
        type.isAcceptableOrUnknown(data['type']!, _typeMeta),
      );
    } else if (isInserting) {
      context.missing(_typeMeta);
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
  MediaItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MediaItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}date'],
      )!,
      type: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}type'],
      )!,
      duration: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}duration'],
      )!,
      rate: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}rate'],
      )!,
      tags: $MediaItemsTable.$convertertags.fromSql(
        attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}tags'],
        )!,
      ),
      thumbs: $MediaItemsTable.$converterthumbs.fromSql(
        attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}thumbs'],
        )!,
      ),
    );
  }

  @override
  $MediaItemsTable createAlias(String alias) {
    return $MediaItemsTable(attachedDatabase, alias);
  }

  static TypeConverter<List<int>, String> $convertertags =
      const IntListConverter();
  static TypeConverter<List<String>, String> $converterthumbs =
      const StringListConverter();
}

class MediaItem extends DataClass implements Insertable<MediaItem> {
  final int id;
  final String title;
  final DateTime date;
  final String type;
  final int duration;
  final int rate;
  final List<int> tags;
  final List<String> thumbs;
  const MediaItem({
    required this.id,
    required this.title,
    required this.date,
    required this.type,
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
    map['date'] = Variable<DateTime>(date);
    map['type'] = Variable<String>(type);
    map['duration'] = Variable<int>(duration);
    map['rate'] = Variable<int>(rate);
    {
      map['tags'] = Variable<String>(
        $MediaItemsTable.$convertertags.toSql(tags),
      );
    }
    {
      map['thumbs'] = Variable<String>(
        $MediaItemsTable.$converterthumbs.toSql(thumbs),
      );
    }
    return map;
  }

  MediaItemsCompanion toCompanion(bool nullToAbsent) {
    return MediaItemsCompanion(
      id: Value(id),
      title: Value(title),
      date: Value(date),
      type: Value(type),
      duration: Value(duration),
      rate: Value(rate),
      tags: Value(tags),
      thumbs: Value(thumbs),
    );
  }

  factory MediaItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MediaItem(
      id: serializer.fromJson<int>(json['id']),
      title: serializer.fromJson<String>(json['title']),
      date: serializer.fromJson<DateTime>(json['date']),
      type: serializer.fromJson<String>(json['type']),
      duration: serializer.fromJson<int>(json['duration']),
      rate: serializer.fromJson<int>(json['rate']),
      tags: serializer.fromJson<List<int>>(json['tags']),
      thumbs: serializer.fromJson<List<String>>(json['thumbs']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'title': serializer.toJson<String>(title),
      'date': serializer.toJson<DateTime>(date),
      'type': serializer.toJson<String>(type),
      'duration': serializer.toJson<int>(duration),
      'rate': serializer.toJson<int>(rate),
      'tags': serializer.toJson<List<int>>(tags),
      'thumbs': serializer.toJson<List<String>>(thumbs),
    };
  }

  MediaItem copyWith({
    int? id,
    String? title,
    DateTime? date,
    String? type,
    int? duration,
    int? rate,
    List<int>? tags,
    List<String>? thumbs,
  }) => MediaItem(
    id: id ?? this.id,
    title: title ?? this.title,
    date: date ?? this.date,
    type: type ?? this.type,
    duration: duration ?? this.duration,
    rate: rate ?? this.rate,
    tags: tags ?? this.tags,
    thumbs: thumbs ?? this.thumbs,
  );
  MediaItem copyWithCompanion(MediaItemsCompanion data) {
    return MediaItem(
      id: data.id.present ? data.id.value : this.id,
      title: data.title.present ? data.title.value : this.title,
      date: data.date.present ? data.date.value : this.date,
      type: data.type.present ? data.type.value : this.type,
      duration: data.duration.present ? data.duration.value : this.duration,
      rate: data.rate.present ? data.rate.value : this.rate,
      tags: data.tags.present ? data.tags.value : this.tags,
      thumbs: data.thumbs.present ? data.thumbs.value : this.thumbs,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MediaItem(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('date: $date, ')
          ..write('type: $type, ')
          ..write('duration: $duration, ')
          ..write('rate: $rate, ')
          ..write('tags: $tags, ')
          ..write('thumbs: $thumbs')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, title, date, type, duration, rate, tags, thumbs);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaItem &&
          other.id == this.id &&
          other.title == this.title &&
          other.date == this.date &&
          other.type == this.type &&
          other.duration == this.duration &&
          other.rate == this.rate &&
          other.tags == this.tags &&
          other.thumbs == this.thumbs);
}

class MediaItemsCompanion extends UpdateCompanion<MediaItem> {
  final Value<int> id;
  final Value<String> title;
  final Value<DateTime> date;
  final Value<String> type;
  final Value<int> duration;
  final Value<int> rate;
  final Value<List<int>> tags;
  final Value<List<String>> thumbs;
  const MediaItemsCompanion({
    this.id = const Value.absent(),
    this.title = const Value.absent(),
    this.date = const Value.absent(),
    this.type = const Value.absent(),
    this.duration = const Value.absent(),
    this.rate = const Value.absent(),
    this.tags = const Value.absent(),
    this.thumbs = const Value.absent(),
  });
  MediaItemsCompanion.insert({
    this.id = const Value.absent(),
    required String title,
    required DateTime date,
    required String type,
    required int duration,
    required int rate,
    required List<int> tags,
    required List<String> thumbs,
  }) : title = Value(title),
       date = Value(date),
       type = Value(type),
       duration = Value(duration),
       rate = Value(rate),
       tags = Value(tags),
       thumbs = Value(thumbs);
  static Insertable<MediaItem> custom({
    Expression<int>? id,
    Expression<String>? title,
    Expression<DateTime>? date,
    Expression<String>? type,
    Expression<int>? duration,
    Expression<int>? rate,
    Expression<String>? tags,
    Expression<String>? thumbs,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (title != null) 'title': title,
      if (date != null) 'date': date,
      if (type != null) 'type': type,
      if (duration != null) 'duration': duration,
      if (rate != null) 'rate': rate,
      if (tags != null) 'tags': tags,
      if (thumbs != null) 'thumbs': thumbs,
    });
  }

  MediaItemsCompanion copyWith({
    Value<int>? id,
    Value<String>? title,
    Value<DateTime>? date,
    Value<String>? type,
    Value<int>? duration,
    Value<int>? rate,
    Value<List<int>>? tags,
    Value<List<String>>? thumbs,
  }) {
    return MediaItemsCompanion(
      id: id ?? this.id,
      title: title ?? this.title,
      date: date ?? this.date,
      type: type ?? this.type,
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
    if (date.present) {
      map['date'] = Variable<DateTime>(date.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (duration.present) {
      map['duration'] = Variable<int>(duration.value);
    }
    if (rate.present) {
      map['rate'] = Variable<int>(rate.value);
    }
    if (tags.present) {
      map['tags'] = Variable<String>(
        $MediaItemsTable.$convertertags.toSql(tags.value),
      );
    }
    if (thumbs.present) {
      map['thumbs'] = Variable<String>(
        $MediaItemsTable.$converterthumbs.toSql(thumbs.value),
      );
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MediaItemsCompanion(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('date: $date, ')
          ..write('type: $type, ')
          ..write('duration: $duration, ')
          ..write('rate: $rate, ')
          ..write('tags: $tags, ')
          ..write('thumbs: $thumbs')
          ..write(')'))
        .toString();
  }
}

class $HistoryItemsTable extends HistoryItems
    with TableInfo<$HistoryItemsTable, HistoryItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HistoryItemsTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _mediaMeta = const VerificationMeta('media');
  @override
  late final GeneratedColumn<int> media = GeneratedColumn<int>(
    'media',
    aliasedName,
    false,
    type: DriftSqlType.int,
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
  @override
  List<GeneratedColumn> get $columns => [id, media, date];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'history_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<HistoryItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('media')) {
      context.handle(
        _mediaMeta,
        media.isAcceptableOrUnknown(data['media']!, _mediaMeta),
      );
    } else if (isInserting) {
      context.missing(_mediaMeta);
    }
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  HistoryItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return HistoryItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      media: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}media'],
      )!,
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}date'],
      )!,
    );
  }

  @override
  $HistoryItemsTable createAlias(String alias) {
    return $HistoryItemsTable(attachedDatabase, alias);
  }
}

class HistoryItem extends DataClass implements Insertable<HistoryItem> {
  final int id;
  final int media;
  final DateTime date;
  const HistoryItem({
    required this.id,
    required this.media,
    required this.date,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['media'] = Variable<int>(media);
    map['date'] = Variable<DateTime>(date);
    return map;
  }

  HistoryItemsCompanion toCompanion(bool nullToAbsent) {
    return HistoryItemsCompanion(
      id: Value(id),
      media: Value(media),
      date: Value(date),
    );
  }

  factory HistoryItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return HistoryItem(
      id: serializer.fromJson<int>(json['id']),
      media: serializer.fromJson<int>(json['media']),
      date: serializer.fromJson<DateTime>(json['date']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'media': serializer.toJson<int>(media),
      'date': serializer.toJson<DateTime>(date),
    };
  }

  HistoryItem copyWith({int? id, int? media, DateTime? date}) => HistoryItem(
    id: id ?? this.id,
    media: media ?? this.media,
    date: date ?? this.date,
  );
  HistoryItem copyWithCompanion(HistoryItemsCompanion data) {
    return HistoryItem(
      id: data.id.present ? data.id.value : this.id,
      media: data.media.present ? data.media.value : this.media,
      date: data.date.present ? data.date.value : this.date,
    );
  }

  @override
  String toString() {
    return (StringBuffer('HistoryItem(')
          ..write('id: $id, ')
          ..write('media: $media, ')
          ..write('date: $date')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, media, date);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is HistoryItem &&
          other.id == this.id &&
          other.media == this.media &&
          other.date == this.date);
}

class HistoryItemsCompanion extends UpdateCompanion<HistoryItem> {
  final Value<int> id;
  final Value<int> media;
  final Value<DateTime> date;
  const HistoryItemsCompanion({
    this.id = const Value.absent(),
    this.media = const Value.absent(),
    this.date = const Value.absent(),
  });
  HistoryItemsCompanion.insert({
    this.id = const Value.absent(),
    required int media,
    required DateTime date,
  }) : media = Value(media),
       date = Value(date);
  static Insertable<HistoryItem> custom({
    Expression<int>? id,
    Expression<int>? media,
    Expression<DateTime>? date,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (media != null) 'media': media,
      if (date != null) 'date': date,
    });
  }

  HistoryItemsCompanion copyWith({
    Value<int>? id,
    Value<int>? media,
    Value<DateTime>? date,
  }) {
    return HistoryItemsCompanion(
      id: id ?? this.id,
      media: media ?? this.media,
      date: date ?? this.date,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (media.present) {
      map['media'] = Variable<int>(media.value);
    }
    if (date.present) {
      map['date'] = Variable<DateTime>(date.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HistoryItemsCompanion(')
          ..write('id: $id, ')
          ..write('media: $media, ')
          ..write('date: $date')
          ..write(')'))
        .toString();
  }
}

class $TagItemsTable extends TagItems with TableInfo<$TagItemsTable, TagItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TagItemsTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, name];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'tag_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<TagItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TagItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TagItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
    );
  }

  @override
  $TagItemsTable createAlias(String alias) {
    return $TagItemsTable(attachedDatabase, alias);
  }
}

class TagItem extends DataClass implements Insertable<TagItem> {
  final int id;
  final String name;
  const TagItem({required this.id, required this.name});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    return map;
  }

  TagItemsCompanion toCompanion(bool nullToAbsent) {
    return TagItemsCompanion(id: Value(id), name: Value(name));
  }

  factory TagItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TagItem(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
    };
  }

  TagItem copyWith({int? id, String? name}) =>
      TagItem(id: id ?? this.id, name: name ?? this.name);
  TagItem copyWithCompanion(TagItemsCompanion data) {
    return TagItem(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TagItem(')
          ..write('id: $id, ')
          ..write('name: $name')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TagItem && other.id == this.id && other.name == this.name);
}

class TagItemsCompanion extends UpdateCompanion<TagItem> {
  final Value<int> id;
  final Value<String> name;
  const TagItemsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
  });
  TagItemsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
  }) : name = Value(name);
  static Insertable<TagItem> custom({
    Expression<int>? id,
    Expression<String>? name,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
    });
  }

  TagItemsCompanion copyWith({Value<int>? id, Value<String>? name}) {
    return TagItemsCompanion(id: id ?? this.id, name: name ?? this.name);
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TagItemsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $MediaItemsTable mediaItems = $MediaItemsTable(this);
  late final $HistoryItemsTable historyItems = $HistoryItemsTable(this);
  late final $TagItemsTable tagItems = $TagItemsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    mediaItems,
    historyItems,
    tagItems,
  ];
}

typedef $$MediaItemsTableCreateCompanionBuilder =
    MediaItemsCompanion Function({
      Value<int> id,
      required String title,
      required DateTime date,
      required String type,
      required int duration,
      required int rate,
      required List<int> tags,
      required List<String> thumbs,
    });
typedef $$MediaItemsTableUpdateCompanionBuilder =
    MediaItemsCompanion Function({
      Value<int> id,
      Value<String> title,
      Value<DateTime> date,
      Value<String> type,
      Value<int> duration,
      Value<int> rate,
      Value<List<int>> tags,
      Value<List<String>> thumbs,
    });

class $$MediaItemsTableFilterComposer
    extends Composer<_$AppDatabase, $MediaItemsTable> {
  $$MediaItemsTableFilterComposer({
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

  ColumnFilters<DateTime> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get type => $composableBuilder(
    column: $table.type,
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

  ColumnWithTypeConverterFilters<List<int>, List<int>, String> get tags =>
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

class $$MediaItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $MediaItemsTable> {
  $$MediaItemsTableOrderingComposer({
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

  ColumnOrderings<DateTime> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get type => $composableBuilder(
    column: $table.type,
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

class $$MediaItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $MediaItemsTable> {
  $$MediaItemsTableAnnotationComposer({
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

  GeneratedColumn<DateTime> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<int> get duration =>
      $composableBuilder(column: $table.duration, builder: (column) => column);

  GeneratedColumn<int> get rate =>
      $composableBuilder(column: $table.rate, builder: (column) => column);

  GeneratedColumnWithTypeConverter<List<int>, String> get tags =>
      $composableBuilder(column: $table.tags, builder: (column) => column);

  GeneratedColumnWithTypeConverter<List<String>, String> get thumbs =>
      $composableBuilder(column: $table.thumbs, builder: (column) => column);
}

class $$MediaItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $MediaItemsTable,
          MediaItem,
          $$MediaItemsTableFilterComposer,
          $$MediaItemsTableOrderingComposer,
          $$MediaItemsTableAnnotationComposer,
          $$MediaItemsTableCreateCompanionBuilder,
          $$MediaItemsTableUpdateCompanionBuilder,
          (
            MediaItem,
            BaseReferences<_$AppDatabase, $MediaItemsTable, MediaItem>,
          ),
          MediaItem,
          PrefetchHooks Function()
        > {
  $$MediaItemsTableTableManager(_$AppDatabase db, $MediaItemsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MediaItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MediaItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MediaItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<DateTime> date = const Value.absent(),
                Value<String> type = const Value.absent(),
                Value<int> duration = const Value.absent(),
                Value<int> rate = const Value.absent(),
                Value<List<int>> tags = const Value.absent(),
                Value<List<String>> thumbs = const Value.absent(),
              }) => MediaItemsCompanion(
                id: id,
                title: title,
                date: date,
                type: type,
                duration: duration,
                rate: rate,
                tags: tags,
                thumbs: thumbs,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String title,
                required DateTime date,
                required String type,
                required int duration,
                required int rate,
                required List<int> tags,
                required List<String> thumbs,
              }) => MediaItemsCompanion.insert(
                id: id,
                title: title,
                date: date,
                type: type,
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

typedef $$MediaItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $MediaItemsTable,
      MediaItem,
      $$MediaItemsTableFilterComposer,
      $$MediaItemsTableOrderingComposer,
      $$MediaItemsTableAnnotationComposer,
      $$MediaItemsTableCreateCompanionBuilder,
      $$MediaItemsTableUpdateCompanionBuilder,
      (MediaItem, BaseReferences<_$AppDatabase, $MediaItemsTable, MediaItem>),
      MediaItem,
      PrefetchHooks Function()
    >;
typedef $$HistoryItemsTableCreateCompanionBuilder =
    HistoryItemsCompanion Function({
      Value<int> id,
      required int media,
      required DateTime date,
    });
typedef $$HistoryItemsTableUpdateCompanionBuilder =
    HistoryItemsCompanion Function({
      Value<int> id,
      Value<int> media,
      Value<DateTime> date,
    });

class $$HistoryItemsTableFilterComposer
    extends Composer<_$AppDatabase, $HistoryItemsTable> {
  $$HistoryItemsTableFilterComposer({
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

  ColumnFilters<int> get media => $composableBuilder(
    column: $table.media,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );
}

class $$HistoryItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $HistoryItemsTable> {
  $$HistoryItemsTableOrderingComposer({
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

  ColumnOrderings<int> get media => $composableBuilder(
    column: $table.media,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$HistoryItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $HistoryItemsTable> {
  $$HistoryItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get media =>
      $composableBuilder(column: $table.media, builder: (column) => column);

  GeneratedColumn<DateTime> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);
}

class $$HistoryItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HistoryItemsTable,
          HistoryItem,
          $$HistoryItemsTableFilterComposer,
          $$HistoryItemsTableOrderingComposer,
          $$HistoryItemsTableAnnotationComposer,
          $$HistoryItemsTableCreateCompanionBuilder,
          $$HistoryItemsTableUpdateCompanionBuilder,
          (
            HistoryItem,
            BaseReferences<_$AppDatabase, $HistoryItemsTable, HistoryItem>,
          ),
          HistoryItem,
          PrefetchHooks Function()
        > {
  $$HistoryItemsTableTableManager(_$AppDatabase db, $HistoryItemsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HistoryItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HistoryItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HistoryItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> media = const Value.absent(),
                Value<DateTime> date = const Value.absent(),
              }) => HistoryItemsCompanion(id: id, media: media, date: date),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int media,
                required DateTime date,
              }) => HistoryItemsCompanion.insert(
                id: id,
                media: media,
                date: date,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$HistoryItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HistoryItemsTable,
      HistoryItem,
      $$HistoryItemsTableFilterComposer,
      $$HistoryItemsTableOrderingComposer,
      $$HistoryItemsTableAnnotationComposer,
      $$HistoryItemsTableCreateCompanionBuilder,
      $$HistoryItemsTableUpdateCompanionBuilder,
      (
        HistoryItem,
        BaseReferences<_$AppDatabase, $HistoryItemsTable, HistoryItem>,
      ),
      HistoryItem,
      PrefetchHooks Function()
    >;
typedef $$TagItemsTableCreateCompanionBuilder =
    TagItemsCompanion Function({Value<int> id, required String name});
typedef $$TagItemsTableUpdateCompanionBuilder =
    TagItemsCompanion Function({Value<int> id, Value<String> name});

class $$TagItemsTableFilterComposer
    extends Composer<_$AppDatabase, $TagItemsTable> {
  $$TagItemsTableFilterComposer({
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

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );
}

class $$TagItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $TagItemsTable> {
  $$TagItemsTableOrderingComposer({
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

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TagItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $TagItemsTable> {
  $$TagItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);
}

class $$TagItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TagItemsTable,
          TagItem,
          $$TagItemsTableFilterComposer,
          $$TagItemsTableOrderingComposer,
          $$TagItemsTableAnnotationComposer,
          $$TagItemsTableCreateCompanionBuilder,
          $$TagItemsTableUpdateCompanionBuilder,
          (TagItem, BaseReferences<_$AppDatabase, $TagItemsTable, TagItem>),
          TagItem,
          PrefetchHooks Function()
        > {
  $$TagItemsTableTableManager(_$AppDatabase db, $TagItemsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TagItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TagItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TagItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> name = const Value.absent(),
              }) => TagItemsCompanion(id: id, name: name),
          createCompanionCallback:
              ({Value<int> id = const Value.absent(), required String name}) =>
                  TagItemsCompanion.insert(id: id, name: name),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TagItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TagItemsTable,
      TagItem,
      $$TagItemsTableFilterComposer,
      $$TagItemsTableOrderingComposer,
      $$TagItemsTableAnnotationComposer,
      $$TagItemsTableCreateCompanionBuilder,
      $$TagItemsTableUpdateCompanionBuilder,
      (TagItem, BaseReferences<_$AppDatabase, $TagItemsTable, TagItem>),
      TagItem,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$MediaItemsTableTableManager get mediaItems =>
      $$MediaItemsTableTableManager(_db, _db.mediaItems);
  $$HistoryItemsTableTableManager get historyItems =>
      $$HistoryItemsTableTableManager(_db, _db.historyItems);
  $$TagItemsTableTableManager get tagItems =>
      $$TagItemsTableTableManager(_db, _db.tagItems);
}
