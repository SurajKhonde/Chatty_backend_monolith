import mongoose from 'mongoose';
import { PushOperator } from 'mongodb';
import { UserModel } from '@user/models/user.schema';

class BlockUserService {
  public async blockUser(userId: string, followerId: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const followerObjectId = new mongoose.Types.ObjectId(followerId);

    await UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: userObjectId, blocked: { $ne: followerObjectId } },
          update: {
            $push: {
              blocked: followerObjectId
            } as PushOperator<Document>
          }
        }
      },
      {
        updateOne: {
          filter: { _id: followerObjectId, blockedBy: { $ne: userObjectId } },
          update: {
            $push: {
              blockedBy: userObjectId
            } as PushOperator<Document>
          }
        }
      }
    ]);
  }

  public async unblockUser(userId: string, followerId: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const followerObjectId = new mongoose.Types.ObjectId(followerId);

    await UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: userObjectId },
          update: {
            $pull: {
              blocked: followerObjectId
            } as any
          }
        }
      },
      {
        updateOne: {
          filter: { _id: followerObjectId },
          update: {
            $pull: {
              blockedBy: userObjectId
            } as any
          }
        }
      }
    ]);
  }
}

export const blockUserService: BlockUserService = new BlockUserService();
