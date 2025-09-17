import 'dart:io';
import 'dart:convert';
import 'package:drift/drift.dart' as drift;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:path/path.dart' as path;

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
        scrollbarTheme: ScrollbarThemeData(
          thumbVisibility: WidgetStateProperty.all(true),
          trackVisibility: WidgetStateProperty.all(true),
          thickness: WidgetStateProperty.all(8.0),
        )
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
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MyTube'),
      ),
      body: const MediaGallery(),
    );
  }
}

class MediaGallery extends StatefulWidget {
  const MediaGallery({super.key});

  @override
  State<MediaGallery> createState() => _MediaGalleryState();
}

class _MediaGalleryState extends State<MediaGallery> {
  List<VideoItem> _mediaFiles = [];
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
    _scanAndLoadMedia();
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

      final allItems = await (appDatabase.select(appDatabase.videoItems)
            ..orderBy([
              (t) => drift.OrderingTerm(
                  expression: t.date, mode: drift.OrderingMode.desc)
            ]))
          .get();

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

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 300,
        childAspectRatio: 1.15,
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
      ),
      itemCount: _mediaFiles.length,
      itemBuilder: (context, index) {
        final mediaItem = _mediaFiles[index];
        return MediaCard(mediaItem: mediaItem);
      },
    );
  }
}

class MediaCard extends StatefulWidget {
  final VideoItem mediaItem;

  const MediaCard({super.key, required this.mediaItem});

  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  bool isHovering = false;

  @override
  Widget build(BuildContext context) {
    final mediaPath = 'N:\\Videos\\${widget.mediaItem.title}';
    final isVideo = widget.mediaItem.type == 'video';

    late final Widget thumb;
    
    if (isVideo) {
      if (widget.mediaItem.thumbs.isEmpty) {
        thumb = Container(
          color: Colors.black,
          child: const Icon(
            Icons.play_circle_outline_rounded,
            color: Colors.white,
            size: 50,
          ),
        );
      } else {
        if (widget.mediaItem.thumbs.length == 1) {
          thumb = Image.memory(
            base64Decode(widget.mediaItem.thumbs.first),
            fit: BoxFit.fitHeight,
          );
        } else {
          thumb = CarouselSlider.builder(
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
    } else {
      thumb = Image.file(
        File(mediaPath),
        fit: BoxFit.fitHeight,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Colors.grey[300],
            child: const Icon(Icons.broken_image, size: 50),
          );
        },
      );
    }

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => MediaDetailPage(
              filePath: mediaPath,
              isVideo: isVideo,
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
                        Text(widget.mediaItem.date.toString(), style: const TextStyle(fontSize: 12)),
                        Text('♥♥♥♥♥ ${widget.mediaItem.rate}', style: const TextStyle(fontSize: 16)),
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
  final String filePath;
  final bool isVideo;

  const MediaDetailPage(
      {super.key, required this.filePath, required this.isVideo});

  @override
  State<MediaDetailPage> createState() => _MediaDetailPageState();
}

class _MediaDetailPageState extends State<MediaDetailPage> {
  late final Player _player;
  late final VideoController _controller;

  @override
  void initState() {
    super.initState();
    if (widget.isVideo) {
      _player = Player();
      _controller = VideoController(_player);
      final uri = Uri.file(widget.filePath, windows: Platform.isWindows);
      _player.open(Media(uri.toString()));
    }
  }

  @override
  void dispose() {
    if (widget.isVideo) {
      _player.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(path.basename(widget.filePath)),
        actions: [
          IconButton(
            icon: Icon(Icons.play_circle_outline_rounded),
            onPressed: () async {
              print('"${widget.filePath}"');
              Process process = await Process.start('cmd', ['/c', 'start', '""', widget.filePath]);
              process.stdout.transform(utf8.decoder).listen((data) {
                print('Cmd出力: $data');
              });
            },
          )
        ],
      ),
      backgroundColor: Colors.black,
      body: Center(
        child: widget.isVideo
            ? Video(controller: _controller)
            : InteractiveViewer(
                child: Image.file(File(widget.filePath)),
              ),
      ),
    );
  }
}
