import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabase() {
  try {
    console.log('Starting database reset...');
    
    // Delete all characters
    const { error: deleteError } = await supabase
      .from('characters')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (deleteError) {
      console.error('Error deleting characters:', deleteError);
      return;
    }
    
    console.log('✅ Successfully deleted all characters');
    
    // List all files in the storage bucket
    const { data: files, error: listError } = await supabase.storage
      .from('character-assets')
      .list();
    
    if (listError) {
      console.error('Error listing storage files:', listError);
      return;
    }
    
    // Delete all files
    if (files && files.length > 0) {
      const filePaths = files.map(file => file.name);
      const { error: deleteStorageError } = await supabase.storage
        .from('character-assets')
        .remove(filePaths);
      
      if (deleteStorageError) {
        console.error('Error deleting storage files:', deleteStorageError);
        return;
      }
      
      console.log(`✅ Successfully deleted ${filePaths.length} files from storage`);
    } else {
      console.log('ℹ️ No files found in storage');
    }
    
    console.log('\n✅ Database and storage reset completed successfully!');
    console.log('You can now start fresh with a clean database.');
    
  } catch (error) {
    console.error('Error during database reset:', error);
  }
}

// Run the reset function
resetDatabase();
