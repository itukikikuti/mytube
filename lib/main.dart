import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(home: HomePage());
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isFilterApplied = false;

  String? _selectedCategory;
  final List<String> _categories = ['追加順', 'シャッフル', '最近再生した', '再生数', '長さ'];

  final List<String> _allTags = [
    'Flutter',
    'Flustter',
    'Flutterwef',
    'Flutteawr',
    'wf',
    'Falutter',
    'Flwefutter',
    'Flutterff',
    'Flutter1',
    'Flutter2',
    'Flutter3',
    'Flutter4',
    'Flutter5',
    'Flutter6',
    'Flutter7',
    'Flutter8',
    'Fluttererwf',
    'Flutterfawe',
    'Fluttesr',
    'awe',
    'we',
    'Fwefwelutter',
    'Fluttewefr',
    'weeee',
    'Fluteetefefer',
    'weffewe',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Flutter',
    'Dart',
    'UI/UX',
    'Firebase',
    'Go',
  ];
  final Set<String> _selectedTags = {};

  late final player = Player();
  late final controller = VideoController(player);

  @override
  void initState() {
    super.initState();
    player.open(
      Media(
        'https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('フィルタリングサイドバー')),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const SizedBox(height: 50),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton(
                onPressed: () {
                  // ボタンが押された時の処理
                  // 1. 現在のフィルター状態を取得
                  final filters = {
                    'isNewOnly': _isFilterApplied,
                    'category': _selectedCategory,
                    'tags': _selectedTags,
                  };
                  // 2. コンソールに表示（実際のアプリではここでデータ更新処理を呼ぶ）
                  print('適用されたフィルター: $filters');

                  // 3. Drawerを閉じる
                  Navigator.pop(context);

                  // 4. (任意) フィルター適用を伝えるメッセージを表示
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
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️❤️❤️❤️🤍'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️❤️❤️🤍🤍'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️❤️🤍🤍🤍'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('❤️🤍🤍🤍🤍'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('🤍🤍🤍🤍🤍'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),

            const Divider(),

            CheckboxListTile(
              title: const Text('動画'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('画像'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
                });
              },
            ),
            CheckboxListTile(
              title: const Text('GIF'),
              value: _isFilterApplied,
              onChanged: (bool? newValue) {
                setState(() {
                  _isFilterApplied = newValue!;
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
      body: Center(
        child: SizedBox(
          width: MediaQuery.of(context).size.width,
          height: MediaQuery.of(context).size.width * 9.0 / 16.0,
          // Use [Video] widget to display video output.
          child: Video(controller: controller),
        ),
      ),
    );
  }

  @override
  void dispose() {
    player.dispose();
    super.dispose();
  }
}
