import 'dart:io';

import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:path/path.dart' as path;

import 'database.dart';

// Create a global instance of the database
late AppDatabase appDatabase;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  // Initialize the database
  appDatabase = AppDatabase();
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
    _scanAndLoadMedia();
  }

  Future<void> _scanAndLoadMedia() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _statusMessage = 'Starting scan...';
    });

    try {
      // 1. Scan directory for files using an async stream
      const mediaPath = 'N:\\Videos';
      final directory = Directory(mediaPath);
      if (!await directory.exists()) {
        throw Exception('Directory not found: $mediaPath');
      }

      final filesStream = directory.list();
      final List<MediaItemsCompanion> newItems = [];
      int scannedFileCount = 0;

      await for (final file in filesStream) {
        scannedFileCount++;
        final extension = path.extension(file.path).toLowerCase();
        if (_supportedImageExtensions.contains(extension) ||
            _supportedVideoExtensions.contains(extension)) {
          try {
            final stat = await file.stat();
            newItems.add(
              MediaItemsCompanion(
                path: drift.Value(file.path),
                creationTime: drift.Value(stat.changed), // `changed` is creation time on Windows
              ),
            );
            // Update UI to show which file is being scanned
            setState(() {
              _statusMessage = 'Scanning ($scannedFileCount): ${path.basename(file.path)}';
            });
          } catch (e) {
            // Ignore files that can't be stated
          }
        }
      }

      setState(() {
        _statusMessage = 'Updating database with ${newItems.length} new items...';
      });

      // 2. Batch insert new items into the database
      if (newItems.isNotEmpty) {
        await appDatabase.batch((batch) {
          batch.insertAll(
            appDatabase.mediaItems,
            newItems,
            mode: drift.InsertMode.insertOrIgnore,
          );
        });
      }

      setState(() {
        _statusMessage = 'Loading media from database...';
      });

      // 3. Query all items from the database, sorted by creation time
      final allItems = await (appDatabase.select(appDatabase.mediaItems)
            ..orderBy([
              (t) => drift.OrderingTerm(
                  expression: t.creationTime, mode: drift.OrderingMode.desc)
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
        maxCrossAxisExtent: 200,
        childAspectRatio: 1,
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
      ),
      itemCount: _mediaFiles.length,
      itemBuilder: (context, index) {
        final mediaItem = _mediaFiles[index];
        final extension = path.extension(mediaItem.path).toLowerCase();
        final isVideo = _supportedVideoExtensions.contains(extension);

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => MediaDetailPage(
                  filePath: mediaItem.path,
                  isVideo: isVideo,
                ),
              ),
            );
          },
          child: GridTile(
            footer: GridTileBar(
              backgroundColor: Colors.black45,
              title: Text(
                path.basename(mediaItem.path),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            child: isVideo
                ? Container(
                    color: Colors.black,
                    child: const Icon(
                      Icons.play_circle_outline,
                      color: Colors.white,
                      size: 50,
                    ),
                  )
                : Image.file(
                    File(mediaItem.path),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey[300],
                        child: const Icon(Icons.broken_image, size: 50),
                      );
                    },
                  ),
          ),
        );
      },
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
        backgroundColor: Colors.black,
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
