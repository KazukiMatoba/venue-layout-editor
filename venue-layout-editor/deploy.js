#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 設定
const BUCKET_NAME = 'your-venue-editor-app-bucket-name';
const REGION = 'us-east-1';

console.log('🚀 Venue Layout Editorをデプロイ中...');

try {
  // 1. ビルド
  console.log('📦 プロジェクトをビルド中...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. S3にアップロード
  console.log('☁️ S3にアップロード中...');
  execSync(`aws s3 sync dist/ s3://${BUCKET_NAME} --delete`, { stdio: 'inherit' });

  // 3. CloudFrontキャッシュを無効化（オプション）
  console.log('🔄 CloudFrontキャッシュを無効化中...');
  try {
    const distributionId = execSync(`aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Venue Layout Editor CloudFront Distribution'].Id" --output text`).toString().trim();
    if (distributionId) {
      execSync(`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.log('⚠️ CloudFrontの無効化をスキップしました');
  }

  console.log('✅ デプロイが完了しました！');
  console.log(`🌐 アプリURL: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com`);

} catch (error) {
  console.error('❌ デプロイに失敗しました:', error.message);
  process.exit(1);
}