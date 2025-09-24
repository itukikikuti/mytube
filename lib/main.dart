import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:intl/intl.dart';
import 'package:flutter/gestures.dart';
import 'package:image/image.dart' as img;

import 'database.dart';

late AppDatabase appDatabase;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  final dbFile = File('db.sqlite'); 
  appDatabase = AppDatabase(NativeDatabase(dbFile));
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MyTube',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      scrollBehavior: MaterialScrollBehavior().copyWith(
        dragDevices: {
          PointerDeviceKind.touch,
          PointerDeviceKind.mouse,
        }
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isFilterApplied = false;
  bool _show5Star = true;
  bool _show4Star = true;
  bool _show3Star = true;
  bool _show2Star = true;
  bool _show1Star = true;
  bool _show0Star = true;
  bool _showVideos = true;
  bool _showImages = false;
  bool _showGifs = false;

  final List<String> _categories = ['追加順', 'シャッフル', '最近再生した', '再生数', '長さ'];
  String? _selectedCategory = '追加順';

  final List<String> _allTags = [];
  final Set<String> _selectedTags = {};
  List<MediaItem> _mediaFiles = [];
  bool _isLoading = true;
  String _statusMessage = '';
  String? _error;

  final _supportedImageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp'
  ];
  final _supportedVideoExtensions = [
    '.mp4',
    '.mkv',
    '.avi',
    '.mov',
    '.wmv',
    '.webm'
  ];

  @override
  void initState() {
    super.initState();
    _loadTags();
    _scanAndLoadMedia();
  }

  void _loadTags() async {
    final query = appDatabase.select(appDatabase.tagItems)..orderBy([
      (t) => drift.OrderingTerm(expression: t.name, mode: drift.OrderingMode.asc)
    ]);
    final allTags = await query.get();

    setState(() {
      for (final tag in allTags) {
        _allTags.add(tag.name);
      }
    });
  }

  Future<void> _scanAndLoadMedia() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _statusMessage = 'Starting scan...';
    });

    try {
      // // 1. Scan directory for files using an async stream
      // const mediaPath = 'N:\\Videos';
      // final directory = Directory(mediaPath);
      // if (!await directory.exists()) {
      //   throw Exception('Directory not found: $mediaPath');
      // }

      // final filesStream = directory.list();
      // final List<VideoItemsCompanion> newItems = [];
      // int scannedFileCount = 0;

      // await for (final file in filesStream) {
      //   scannedFileCount++;
      //   final extension = path.extension(file.path).toLowerCase();
      //   if (_supportedImageExtensions.contains(extension) ||
      //       _supportedVideoExtensions.contains(extension)) {
      //     try {
      //       final stat = await file.stat();
      //       newItems.add(
      //         VideoItemsCompanion(
      //           path: drift.Value(file.path),
      //           date: drift.Value(stat.changed), // `changed` is creation time on Windows
      //         ),
      //       );
      //       // Update UI to show which file is being scanned
      //       setState(() {
      //         _statusMessage = 'Scanning ($scannedFileCount): ${path.basename(file.path)}';
      //       });
      //     } catch (e) {
      //       // Ignore files that can't be stated
      //     }
      //   }
      // }

      // setState(() {
      //   _statusMessage = 'Updating database with ${newItems.length} new items...';
      // });

      // // 2. Batch insert new items into the database
      // if (newItems.isNotEmpty) {
      //   await appDatabase.batch((batch) {
      //     batch.insertAll(
      //       appDatabase.videoItems,
      //       newItems,
      //       mode: drift.InsertMode.insertOrIgnore,
      //     );
      //   });
      // }

      // setState(() {
      //   _statusMessage = 'Loading media from database...';
      // });

      drift.Expression<bool> filter(MediaItems t) {
        return ((t.rate.equals(5) & drift.Constant(_show5Star)) |
        (t.rate.equals(4) & drift.Constant(_show4Star)) |
        (t.rate.equals(3) & drift.Constant(_show3Star)) |
        (t.rate.equals(2) & drift.Constant(_show2Star)) |
        (t.rate.equals(1) & drift.Constant(_show1Star)) |
        (t.rate.equals(0) & drift.Constant(_show0Star))) &
        ((t.type.equals('video') & drift.Constant(_showVideos)) |
        (t.type.equals('image') & drift.Constant(_showImages)) |
        (t.type.equals('anime') & drift.Constant(_showGifs)));
      }

      late final List<MediaItem> allItems;

      switch (_selectedCategory) {
        case 'シャッフル':
          final query = appDatabase.select(appDatabase.mediaItems)..where(filter)..orderBy([(t) => drift.OrderingTerm.random()]);
          allItems = await query.get();
          break;
        case '最近再生した':
          final latestHistoryDate = appDatabase.historyItems.date.max();
          // 1. ソートされたIDのリストを取得するクエリ
          final sortedIdQuery = appDatabase.selectOnly(appDatabase.mediaItems)
            ..addColumns([appDatabase.mediaItems.id])
            ..join([
              drift.leftOuterJoin(appDatabase.historyItems, appDatabase.historyItems.media.equalsExp(appDatabase.mediaItems.id))
            ])
            ..where(filter(appDatabase.mediaItems))
            ..groupBy([appDatabase.mediaItems.id]) // IDでグループ化
            ..orderBy([
              drift.OrderingTerm(expression: latestHistoryDate, mode: drift.OrderingMode.desc, nulls: drift.NullsOrder.last),
              drift.OrderingTerm(expression: appDatabase.mediaItems.date, mode: drift.OrderingMode.desc),
            ]);

          // 2. IDリストを取得し、その順序でMediaItemを取得
          final sortedIds = (await sortedIdQuery.map((row) => row.read(appDatabase.mediaItems.id)).get()).whereType<int>().toList();
          final sortedItems = await (appDatabase.select(appDatabase.mediaItems)..where((t) => t.id.isIn(sortedIds))).get();
          // データベースから取得した順序ではなく、IDリストの順序に並べ替える
          allItems = sortedIds.map((id) => sortedItems.firstWhere((item) => item.id == id)).toList();
          break;
        case '再生数':
          final playCount = appDatabase.historyItems.id.count();
          // 1.　ソートされたIDのリストを取得するクエリ
          final sortedIdQuery = appDatabase.selectOnly(appDatabase.mediaItems)
            ..addColumns([appDatabase.mediaItems.id])
            ..join([
              drift.leftOuterJoin(appDatabase.historyItems, appDatabase.historyItems.media.equalsExp(appDatabase.mediaItems.id))
            ])
            ..where(filter(appDatabase.mediaItems))
            ..groupBy([appDatabase.mediaItems.id]) // IDでグループ化
            ..orderBy([
              drift.OrderingTerm(expression: playCount, mode: drift.OrderingMode.desc),
              drift.OrderingTerm(expression: appDatabase.mediaItems.date, mode: drift.OrderingMode.desc),
            ]);

          // 2. IDリストを取得し、その順序でMediaItemを取得
          final sortedIds = (await sortedIdQuery.map((row) => row.read(appDatabase.mediaItems.id)).get()).whereType<int>().toList();
          final sortedItems = await (appDatabase.select(appDatabase.mediaItems)..where((t) => t.id.isIn(sortedIds))).get();
          // データベースから取得した順序ではなく、IDリストの順序に並べ替える
          allItems = sortedIds.map((id) => sortedItems.firstWhere((item) => item.id == id)).toList();
          break;
        case '長さ':
          final query = appDatabase.select(appDatabase.mediaItems)..where(filter)..orderBy([(t) => drift.OrderingTerm(expression: t.duration, mode: drift.OrderingMode.desc)]);
          allItems = await query.get();
          break;
        case '追加順':
        default:
          final query = appDatabase.select(appDatabase.mediaItems)..where(filter)..orderBy([(t) => drift.OrderingTerm(expression: t.date, mode: drift.OrderingMode.desc)]);
          allItems = await query.get();
          break;
      }
      
      setState(() {
        _mediaFiles = allItems;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(_statusMessage, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Text(
          _error!,
          style: const TextStyle(color: Colors.red),
        ),
      );
    }

    if (_mediaFiles.isEmpty) {
      return const Center(child: Text('No media files found in the database.'));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('MyTube'),
      ),
      drawer: Drawer(
        width: 500,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const SizedBox(height: 50),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton(
                onPressed: () async {
                  final filters = {
                    'isNewOnly': _isFilterApplied,
                    'category': _selectedCategory,
                    'tags': _selectedTags,
                  };
                  print('適用されたフィルター: $filters');

                  Navigator.pop(context);

                  await _scanAndLoadMedia();

                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(const SnackBar(content: Text('フィルターを適用しました')));
                },
                child: const Text('この条件で絞り込む'),
              ),
            ),

            const Divider(),

            CheckboxListTile(
              title: const Text('❤️❤️❤️❤️❤️'),
              value: _show5Star,
              onChanged: (bool? newValue) {
                setState(() {
                  _show5Star = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️❤️❤️❤️🤍'),
              value: _show4Star,
              onChanged: (bool? newValue) {
                setState(() {
                  _show4Star = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️❤️❤️🤍🤍'),
              value: _show3Star,
              onChanged: (bool? newValue) {
                setState(() {
                  _show3Star = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️❤️🤍🤍🤍'),
              value: _show2Star,
              onChanged: (bool? newValue) {
                setState(() {
                  _show2Star = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️🤍🤍🤍🤍'),
              value: _show1Star,
              onChanged: (bool? newValue) {
                setState(() {
                  _show1Star = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('🤍🤍🤍🤍🤍'),
              value: _show0Star,
              onChanged: (bool? newValue) {
                setState(() {
                  _show0Star = newValue!;
                });
              },
            ),

            const Divider(),

            CheckboxListTile(
              title: const Text('動画'),
              value: _showVideos,
              onChanged: (bool? newValue) async {
                setState(() {
                  _showVideos = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('画像'),
              value: _showImages,
              onChanged: (bool? newValue) async {
                setState(() {
                  _showImages = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('GIF'),
              value: _showGifs,
              onChanged: (bool? newValue) async {
                setState(() {
                  _showGifs = newValue!;
                });
              },
            ),

            const Divider(),

            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 16.0,
                vertical: 8.0,
              ),
              child: DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'カテゴリ選択',
                  border: OutlineInputBorder(),
                ),
                value: _selectedCategory,
                hint: const Text('選択してください'),
                items: _categories.map((String category) {
                  return DropdownMenuItem<String>(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedCategory = newValue;
                  });
                },
              ),
            ),

            const Divider(),

            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'タグで絞り込む',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Wrap(
                spacing: 8.0,
                runSpacing: 4.0,
                children: _allTags.map((String tag) {
                  return FilterChip(
                    label: Text(tag),
                    selected: _selectedTags.contains(tag),
                    onSelected: (bool selected) {
                      setState(() {
                        if (selected) {
                          _selectedTags.add(tag);
                        } else {
                          _selectedTags.remove(tag);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
      body: GridView.builder(
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 300,
          childAspectRatio: 1.1,
          crossAxisSpacing: 4,
          mainAxisSpacing: 4,
        ),
        itemCount: _mediaFiles.length,
        itemBuilder: (context, index) {
          final mediaItem = _mediaFiles[index];
          return MediaCard(mediaItem: mediaItem);
        },
      ),
    );
  }
}

class MediaCard extends StatefulWidget {
  final MediaItem mediaItem;

  const MediaCard({super.key, required this.mediaItem});

  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  bool isHovering = false;

  Future<int> fetchData() async {
    // await Future.delayed(const Duration(seconds: 2));
    final query = appDatabase.select(appDatabase.historyItems)..where((t) => t.media.equals(widget.mediaItem.id));
    final historyItems = await query.get();
    return historyItems.length;
  }

  @override
  Widget build(BuildContext context) {
    late final Widget thumb;
    
    if (widget.mediaItem.type == 'video') {
      final time = DateTime.fromMillisecondsSinceEpoch(widget.mediaItem.duration * 1000, isUtc: true);
      late final formatter;
      if (widget.mediaItem.duration >= 3600) {
        formatter = DateFormat('HH:mm:ss');
      } else {
        formatter = DateFormat('mm:ss');
      }
      late final Widget stack;

      if (widget.mediaItem.thumbs.isEmpty) {
        stack = Container(
          color: Colors.black,
          child: const Icon(
            Icons.play_circle_outline_rounded,
            color: Colors.white,
            size: 50,
          ),
        );
      } else {
        if (widget.mediaItem.thumbs.length == 1) {
          stack = Image.memory(
            base64Decode(widget.mediaItem.thumbs.first),
            fit: BoxFit.fitHeight,
          );
        } else {
          stack = CarouselSlider.builder(
            itemCount: widget.mediaItem.thumbs.length,
            itemBuilder: (context, itemIndex, pageViewIndex) {
              return Image.memory(
                base64Decode(widget.mediaItem.thumbs[itemIndex]),
                fit: BoxFit.fitHeight,
              );
            },
            options: CarouselOptions(
              height: double.infinity,
              viewportFraction: 1.0,
              aspectRatio: 1.0,
              autoPlay: widget.mediaItem.thumbs.length > 1,
            ),
          );
        }
      }

      thumb = Stack(
        alignment: Alignment.center,
        children: [
          stack,
          Align(
            alignment: Alignment.bottomRight,
            child: Container(
              margin: const EdgeInsets.all(4),
              padding: const EdgeInsets.only(left: 4, right: 4, top: 0, bottom: 2),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                formatter.format(time),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          )
        ]
      );
    } else {
      thumb = Image.file(
        File('N:\\Videos\\${widget.mediaItem.title}'),
        fit: BoxFit.fitHeight,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Colors.grey[300],
            child: const Icon(Icons.broken_image, size: 50),
          );
        },
      );
    }

    final formatter = DateFormat('yyyy/M/d');

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => MediaDetailPage(
              mediaItem: widget.mediaItem,
            ),
          ),
        );
      },
      child: Card(
        elevation: 4,
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: Colors.black,
                child: thumb,
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.mediaItem.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        FutureBuilder(
                          future: fetchData(),
                          builder: (context, snapshot) {
                            if (snapshot.connectionState == ConnectionState.waiting) {
                              return Text(formatter.format(widget.mediaItem.date), style: const TextStyle(fontSize: 12));
                            }
                            if (snapshot.hasError) {
                              return Text('?回・${formatter.format(widget.mediaItem.date)}', style: const TextStyle(fontSize: 12));
                            }
                            if (snapshot.hasData) {
                              return Text(
                                '${snapshot.data!}回・${formatter.format(widget.mediaItem.date)}',
                                style: const TextStyle(fontSize: 12)
                                // style: Theme.of(context).textTheme.headlineMedium,
                              );
                            }
                            return Text(formatter.format(widget.mediaItem.date), style: const TextStyle(fontSize: 12));
                          }
                        ),
                        Text('♥${widget.mediaItem.rate}', style: const TextStyle(fontSize: 16)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      // child: GridTile(
      //   footer: GridTileBar(
      //     backgroundColor: Colors.black45,
      //     title: Text(
      //       widget.mediaItem.title,
      //       maxLines: 2,
      //       overflow: TextOverflow.ellipsis,
      //     ),
      //   ),
      //   child: thumb,
      // ),
    );
  }
}

class MediaDetailPage extends StatefulWidget {
  final MediaItem mediaItem;

  const MediaDetailPage({super.key, required this.mediaItem});

  @override
  State<MediaDetailPage> createState() => _MediaDetailPageState();
}

class _MediaDetailPageState extends State<MediaDetailPage> {
  late final Player _player;
  late final VideoController _controller;

  @override
  void initState() {
    super.initState();
    if (widget.mediaItem.type == 'video') {
      _player = Player();
      _controller = VideoController(_player);
      final uri = Uri.file('N:\\Videos\\${widget.mediaItem.title}', windows: Platform.isWindows);
      _player.setPlaylistMode(PlaylistMode.single);
      _player.open(Media(uri.toString()));
    }
  }

  @override
  void dispose() {
    if (widget.mediaItem.type == 'video') {
      _player.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.mediaItem.title),
        actions: [
          IconButton(
            icon: Icon(Icons.play_circle_outline_rounded),
            onPressed: () async {
              await Process.start('cmd', ['/c', 'start', '""', 'N:\\Videos\\${widget.mediaItem.title}']);
              final newHistory = HistoryItemsCompanion(
                media: drift.Value(widget.mediaItem.id),
                date: drift.Value(DateTime.now())
              );
              await appDatabase.into(appDatabase.historyItems).insert(newHistory);
            },
          ),
          IconButton(
            icon: Icon(Icons.image),
            onPressed: () async {
              final Uint8List? screenshotData = await _player.screenshot();

              if (screenshotData == null) {
                print("スクリーンショットの取得に失敗しました。");
                return;
              }

              final img.Image? originalImage = img.decodeImage(screenshotData);
              if (originalImage == null) {
                print("画像のデコードに失敗しました。");
                return;
              }

              final img.Image resizedImage = img.copyResize(
                originalImage,
                height: 180,
              );

              final Uint8List resizedImageData = Uint8List.fromList(
                img.encodeJpg(resizedImage, quality: 90),
              );

              final encoded = base64Encode(resizedImageData);
              print(encoded);
              final query = appDatabase.update(appDatabase.mediaItems)..where((t) => t.id.equals(widget.mediaItem.id));
              setState(() {
                widget.mediaItem.thumbs.add(encoded);
              });
              final result = await query.write(MediaItemsCompanion(thumbs: drift.Value(widget.mediaItem.thumbs)));
              print('$result 件のデータを更新しました。');
            },
          ),
        ],
      ),
      backgroundColor: Colors.black,
      body: Center(
        child: widget.mediaItem.type == 'video'
            ? Video(controller: _controller)
            : InteractiveViewer(
                child: Image.file(File('N:\\Videos\\${widget.mediaItem.title}')),
              ),
      ),
    );
  }
}
